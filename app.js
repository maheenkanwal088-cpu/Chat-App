import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
  import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile }
    from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
  import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, updateDoc, setDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove }
    from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAvytRUtEJqIQPiYO-HzhoSykbfAlxcOzw",
    authDomain: "chat-application-5ac56.firebaseapp.com",
    projectId: "chat-application-5ac56",
    storageBucket: "chat-application-5ac56.firebasestorage.app",
    messagingSenderId: "798665666604",
    appId: "1:798665666604:web:3129879e7ebe1a12136189",
    measurementId: "G-TPLKK815QD"
  };
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  var db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = getFirestore(app);   
  }

  const $ = function (id) { return document.getElementById(id); };
  const authScreen = $("authScreen"), appScreen = $("appScreen"), chatBg = $("chatBg");
  const nameInput = $("nameInput"), emailInput = $("emailInput"), passInput = $("passInput");
  const authBtn = $("authBtn"), authError = $("authError"), authSub = $("authSub"), switchLink = $("switchLink");
  const messagesDiv = $("messages"), msgInput = $("msgInput"), micBtn = $("micBtn"), recText = $("recText");
  const chatList = $("chatList"), modal = $("modal"), modalBox = $("modalBox");

  var isSignup = false;        
  var globalChat = { id: "global", type: "group", name: "Global Room", everyone: true };
  var myChats = [];             var usersList = [];         
  var currentChat = null;      
  var unsubMessages = null, unsubChats = null, unsubUsers = null, unsubGlobal = null;
  var heartbeat = null, headerTimer = null;
  var lastCount = 0;           
  var replyTo = null;

  switchLink.onclick = function () {
    isSignup = !isSignup;
    authError.textContent = "";
    nameInput.classList.toggle("hidden", !isSignup);
    authBtn.textContent = isSignup ? "Sign up" : "Log in";
    authSub.textContent = isSignup ? "Create your account" : "Welcome back! Please log in.";
    switchLink.textContent = isSignup ? "Already have an account? Log in" : "Create a new account";
  };

  authBtn.onclick = async function () {
    var email = emailInput.value.trim(), pass = passInput.value, name = nameInput.value.trim();
    authError.textContent = "";
    if (email == "" || pass == "") { authError.textContent = "Please enter your email and password."; return; }
    if (isSignup && name == "") { authError.textContent = "Please enter your name."; return; }

    authBtn.textContent = "Please wait...";
    try {
      if (isSignup) {
        var result = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(result.user, { displayName: name });
        showMyName();
        saveProfile({});    
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (error) {
      authError.textContent = niceError(error.code);
    }
    authBtn.textContent = isSignup ? "Sign up" : "Log in";
  };
  passInput.onkeydown = function (e) { if (e.key == "Enter") authBtn.click(); };

  function niceError(code) {
    if (code == "auth/email-already-in-use") return "This email is already registered.";
    if (code == "auth/invalid-email") return "Please enter a valid email address.";
    if (code == "auth/weak-password") return "Password must be at least 6 characters.";
    if (code == "auth/invalid-credential" || code == "auth/wrong-password" || code == "auth/user-not-found") return "Incorrect email or password.";
    return "Something went wrong: " + code;
  }

  onAuthStateChanged(auth, function (user) {
    if (user) {
      authScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");
      chatBg.classList.remove("hidden");
      showMyName();
      startApp();
    } else {
      stopApp();
      appScreen.classList.add("hidden");
      chatBg.classList.add("hidden");
      authScreen.classList.remove("hidden");
    }
  });

  $("logoutBtn").onclick = async function () {
    saveProfile({ lastSeen: 0, typingIn: "" });   
    signOut(auth);
  };

  function showMyName() {
    var u = auth.currentUser;
    if (!u) return;
    var n = u.displayName || u.email;
    $("myName").textContent = n;
    $("myAvatar").textContent = n[0].toUpperCase();
  }

  function saveProfile(extra) {
    var u = auth.currentUser;
    if (!u) return Promise.resolve();
    var data = { name: u.displayName || u.email, email: u.email, lastSeen: Date.now() };
    for (var key in extra) { data[key] = extra[key]; }
    return setDoc(doc(db, "users", u.uid), data, { merge: true });
  }

  function startApp() {
    var me = auth.currentUser;
    saveProfile({ typingIn: "" });
    heartbeat = setInterval(function () { saveProfile({}); }, 20000);   
    headerTimer = setInterval(updateHeader, 5000);
    setDoc(doc(db, "chats", "global"), { type: "group", name: "Global Room", everyone: true }, { merge: true });
    
    unsubGlobal = onSnapshot(doc(db, "chats", "global"), function (d) {
      if (d.exists()) { globalChat = d.data(); globalChat.id = "global"; }
      refreshCurrent();
    });
    
    unsubUsers = onSnapshot(collection(db, "users"), function (snap) {
      usersList = [];
      snap.forEach(function (d) { var u = d.data(); u.uid = d.id; usersList.push(u); });
      renderSidebar();
      updateHeader();
    });

    var q = query(collection(db, "chats"), where("members", "array-contains", me.uid));
    unsubChats = onSnapshot(q, function (snap) {
      myChats = [];
      snap.forEach(function (d) { var c = d.data(); c.id = d.id; myChats.push(c); });
      myChats.sort(function (a, b) { return chatTitle(a).localeCompare(chatTitle(b)); });
      renderSidebar();
      refreshCurrent();
    });

    openChat(globalChat);
    appScreen.classList.remove("chatOpen");   
  } // <--- Yahan startApp ka closing brace miss tha jo ab laga diya hai

  function stopApp() {
    clearInterval(heartbeat); clearInterval(headerTimer);
    if (unsubMessages) unsubMessages();
    if (unsubChats) unsubChats();
    if (unsubUsers) unsubUsers();
    if (unsubGlobal) unsubGlobal();
    unsubMessages = unsubChats = unsubUsers = unsubGlobal = null;
    myChats = []; usersList = []; currentChat = null; lastCount = 0;
  }

  function isOnline(u) { return u && Date.now() - (u.lastSeen || 0) < 45000; }
  function findUser(uid) { return usersList.find(function (u) { return u.uid == uid; }); }

  function otherUid(chat) {
    var me = auth.currentUser.uid;
    return chat.members.find(function (id) { return id != me; });
  }

  function chatTitle(chat) {
    if (chat.id == "global") return "Global Room";
    if (chat.type == "private") {
      var other = otherUid(chat);
      var u = findUser(other);
      return u ? u.name : (chat.names && chat.names[other]) || "Unknown";
    }
    return chat.name;
  }

  function chatIcon(chat) {
    if (chat.id == "global") return "🌍";
    if (chat.type == "group") return "👥";
    return chatTitle(chat)[0].toUpperCase();
  }

  function renderSidebar() {
    if (!auth.currentUser) return;
    chatList.innerHTML = "";
    var all = [globalChat].concat(myChats);
    all.forEach(function (chat) {
      var item = document.createElement("div");
      item.className = "chatItem" + (currentChat && currentChat.id == chat.id ? " active" : "");

      var av = document.createElement("div");
      av.className = "avatar";
      av.textContent = chatIcon(chat);
      item.appendChild(av);

      var info = document.createElement("div");
      var sub = chat.id == "global" ? "Everyone" : (chat.type == "group" ? "Group · " + chat.members.length + " members" : "Private chat");
      info.innerHTML = "<b></b><small></small>";
      info.querySelector("b").textContent = chatTitle(chat);
      info.querySelector("small").textContent = sub;
      item.appendChild(info);

      if (chat.type == "private" && isOnline(findUser(otherUid(chat)))) {
        var dot = document.createElement("span");
        dot.className = "dot";
        item.appendChild(dot);
      }
      item.onclick = function () { openChat(chat); };
      chatList.appendChild(item);
    });
  }

  function openChat(chat) {
    currentChat = chat;
    lastCount = 0;
    setReply(null);
    searchInput.value = "";
    appScreen.classList.add("chatOpen");   
    $("headTitle").textContent = chatTitle(chat);
    $("headAvatar").textContent = chatIcon(chat);
    updateHeader();
    updatePinBar();
    renderSidebar();
    loadMessages(chat);
  }

  function refreshCurrent() {
    if (!currentChat) return;
    var fresh = currentChat.id == "global" ? globalChat : myChats.find(function (c) { return c.id == currentChat.id; });
    if (fresh) currentChat = fresh;
    $("headTitle").textContent = chatTitle(currentChat);
    updatePinBar();
    updateHeader();
  }

  $("backBtn").onclick = function () { appScreen.classList.remove("chatOpen"); };

  function updateHeader() {
    if (!currentChat || !auth.currentUser) return;
    var me = auth.currentUser.uid, now = Date.now(), typers = [], text = "";

    usersList.forEach(function (u) {
      if (u.uid != me && u.typingIn == currentChat.id && now - (u.typingAt || 0) < 6000) typers.push(u.name);
    });

    if (typers.length > 0) {
      text = "✍️ " + typers.join(", ") + " typing...";
    } else if (currentChat.type == "private") {
      text = isOnline(findUser(otherUid(currentChat))) ? "🟢 Online" : "Offline";
    } else if (currentChat.id == "global") {
      text = "🟢 " + usersList.filter(isOnline).length + " online";
    } else {
      text = currentChat.members.length + " members";
    }
    $("headSub").textContent = text;
  }

  function msgRef(id) { return doc(db, "chats", currentChat.id, "messages", id); }

  function loadMessages(chat) {
    if (unsubMessages) unsubMessages();
    var q = query(collection(db, "chats", chat.id, "messages"), orderBy("createdAt", "asc"));
    unsubMessages = onSnapshot(q, { includeMetadataChanges: true }, function (snapshot) {
      var me = auth.currentUser;
      if (!me || currentChat.id != chat.id) return;
      var oldTop = messagesDiv.scrollTop;
      messagesDiv.innerHTML = "";
      var shown = 0, lastDay = "";

      snapshot.forEach(function (d) {
        var data = d.data();
        if ((data.deletedFor || []).includes(me.uid)) return;   
        shown++;
        var time = data.createdAt ? data.createdAt.toDate() : new Date();

        var day = time.toDateString() == new Date().toDateString() ? "Today" : time.toLocaleDateString([], { day: "numeric", month: "short" });
        if (day != lastDay) {
          var line = document.createElement("div");
          line.className = "dayLine";
          line.textContent = day;
          messagesDiv.appendChild(line);
          lastDay = day;
        }
        messagesDiv.appendChild(makeMessage(d.id, data, time, d.metadata.hasPendingWrites));
      });

      if (shown == 0) messagesDiv.innerHTML = '<div class="empty">No messages yet 👀<br>Say hello!</div>';
      applySearch();
      if (snapshot.size != lastCount) messagesDiv.scrollTop = messagesDiv.scrollHeight;
      else messagesDiv.scrollTop = oldTop;

      if (snapshot.size > lastCount && lastCount != 0) {
        var last = snapshot.docs[snapshot.size - 1].data();
        if (last.uid != me.uid) playPop();
      }
      lastCount = snapshot.size;
    });
  }

  function makeMessage(id, data, time, pending) {
    var me = auth.currentUser;
    var mine = data.uid == me.uid;
    var box = document.createElement("div");
    box.className = "msg " + (mine ? "mine" : "other");
    box.id = "msg-" + id;
    box.dataset.text = ((data.text || "") + " " + data.name).toLowerCase();

    if (!mine && currentChat.type != "private") {
      var who = document.createElement("div");
      who.className = "who";
      who.textContent = data.name;
      box.appendChild(who);
    }
    if (data.deleted) {
      box.classList.add("gone");
      var gone = document.createElement("div");
      gone.textContent = "🚫 This message was deleted";
      box.appendChild(gone);
      var m2 = document.createElement("div");
      m2.className = "meta";
      m2.textContent = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      box.appendChild(m2);
      return box;
    }
    if (currentChat.pinned && currentChat.pinned.id == id) {
      var pl = document.createElement("div");
      pl.className = "pinned";
      pl.textContent = "📌 Pinned";
      box.appendChild(pl);
    }

    if (data.replyTo) {
      var quote = document.createElement("div");
      quote.className = "replyQuote";
      quote.textContent = data.replyTo.name + ": " + data.replyTo.text;
      box.appendChild(quote);
    }

    if (data.image) {
      var pic = document.createElement("img");
      pic.className = "pic";
      pic.src = data.image;
      pic.onclick = function () { $("lightboxImg").src = data.image; $("lightbox").classList.remove("hidden"); };
      box.appendChild(pic);
    }

    if (data.audio) {
      var audio = document.createElement("audio");
      audio.controls = true;
      audio.src = data.audio;
      box.appendChild(audio);
    } else if (data.text) {
      var text = document.createElement("div");
      text.textContent = data.text;   
      box.appendChild(text);
    }

    var meta = document.createElement("div");
    meta.className = "meta";
    var t = document.createElement("span");
    t.textContent = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (data.edited) t.textContent += " (edited)";
    if (pending) t.textContent += " 🕓";    
    meta.appendChild(t);

    var preview = data.text ? data.text : (data.audio ? "🎤 Voice message" : "🖼️ Photo");

    meta.appendChild(makeBtn("💬", function () { setReply({ name: data.name, text: preview.slice(0, 60) }); }));
    meta.appendChild(makeBtn("📌", function () { pinMessage(id, data.name, preview.slice(0, 60)); }));

    var likes = data.likes || [];
    meta.appendChild(makeBtn(likes.includes(me.uid) ? "❤️" : "🤍", function () {
      updateDoc(msgRef(id), { likes: likes.includes(me.uid) ? arrayRemove(me.uid) : arrayUnion(me.uid) });
    }));

    if (mine && data.text) {
      meta.appendChild(makeBtn("✏️", function () {
        var newText = prompt("Edit your message:", data.text);
        if (newText && newText.trim() != "" && newText != data.text) {
          updateDoc(msgRef(id), { text: newText.trim(), edited: true });
        }
      }));
    }
    meta.appendChild(makeBtn("🗑️", function () { showDeleteOptions(id, mine); }));
    box.appendChild(meta);

    if (likes.length > 0) {
      var heart = document.createElement("div");
      heart.className = "heart";
      heart.textContent = "❤️ " + likes.length;
      box.appendChild(heart);
    }
    return box;
  }

  function makeBtn(icon, onclick) {
    var b = document.createElement("button");
    b.className = "act";
    b.textContent = icon;
    b.onclick = onclick;
    return b;
  }

  function sendMessage(textValue, audioValue, imageValue) {
    if (!currentChat) return;
    var user = auth.currentUser;
    var myReply = replyTo;
    setReply(null);
    saveProfile({ typingIn: "" });

    addDoc(collection(db, "chats", currentChat.id, "messages"), {
      text: textValue || "",
      audio: audioValue || "",
      image: imageValue || "",
      replyTo: myReply,
      edited: false,
      deleted: false,
      deletedFor: [],
      name: user.displayName || user.email,
      uid: user.uid,
      likes: [],
      createdAt: serverTimestamp()
    });
  }

  $("sendBtn").onclick = function () {
    var text = msgInput.value.trim();
    if (text == "") return;
    sendMessage(text, "", "");
    msgInput.value = "";
  };
  msgInput.onkeydown = function (e) { if (e.key == "Enter") $("sendBtn").click(); };

  function showDeleteOptions(id, mine) {
    modalBox.innerHTML = "<h3>Delete message?</h3>";

    addOption("🙈 Delete for me", false, function () {
      updateDoc(msgRef(id), { deletedFor: arrayUnion(auth.currentUser.uid) });
      showToast("Deleted for you");
    });

    if (mine) {   
      addOption("🗑️ Delete for everyone", true, function () {
        updateDoc(msgRef(id), { deleted: true, text: "", audio: "", image: "", likes: [], replyTo: null });
        if (currentChat.pinned && currentChat.pinned.id == id) unpinMessage();
        showToast("Deleted for everyone");
      });
    }
    addOption("Cancel", false, function () {});
    modal.classList.remove("hidden");
  }

  function addOption(label, red, action) {
    var b = document.createElement("button");
    b.className = "optBtn" + (red ? " red" : "");
    b.textContent = label;
    b.onclick = function () { closeModal(); action(); };
    modalBox.appendChild(b);
  }
  function closeModal() { modal.classList.add("hidden"); }
  modal.onclick = function (e) { if (e.target == modal) closeModal(); };

  function pinMessage(id, name, text) {
    updateDoc(doc(db, "chats", currentChat.id), { pinned: { id: id, name: name, text: text } });
    showToast("Message pinned 📌");
  }
  function unpinMessage() {
    updateDoc(doc(db, "chats", currentChat.id), { pinned: null });
  }
  $("unpinBtn").onclick = function (e) { e.stopPropagation(); unpinMessage(); };

  function updatePinBar() {
    var pin = currentChat && currentChat.pinned;
    $("pinBar").classList.toggle("hidden", !pin);
    if (pin) $("pinText").textContent = pin.name + ": " + pin.text;
  }
  $("pinBar").onclick = function () {
    var el = document.getElementById("msg-" + currentChat.pinned.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
      setTimeout(function () { el.classList.remove("flash"); }, 1600);
    } else {
      showToast("That message is not available");
    }
  };

  $("newChatBtn").onclick = function () {
    modalBox.innerHTML = "<h3>Start a new chat</h3>";
    var me = auth.currentUser;
    var others = usersList.filter(function (u) { return u.uid != me.uid; });
    if (others.length == 0) modalBox.innerHTML += "<p>No other users yet. Ask a friend to sign up!</p>";

    others.forEach(function (u) {
      var row = document.createElement("div");
      row.className = "userRow";
      row.innerHTML = '<div class="avatar" style="background:linear-gradient(135deg,#a855f7,#fd79a8);color:white"></div><span></span>';
      row.querySelector(".avatar").textContent = u.name[0].toUpperCase();
      row.querySelector("span").textContent = u.name + (isOnline(u) ? "  🟢" : "");
      row.onclick = function () { startPrivateChat(u); closeModal(); };
      modalBox.appendChild(row);
    });
    modal.classList.remove("hidden");
  };

  function startPrivateChat(other) {
    var me = auth.currentUser;
    var ids = [me.uid, other.uid].sort();
    var chat = { type: "private", members: ids, names: {}, pinned: null };
    chat.names[me.uid] = me.displayName || me.email;
    chat.names[other.uid] = other.name;
    setDoc(doc(db, "chats", ids.join("_")), chat, { merge: true });
    chat.id = ids.join("_");
    openChat(chat);
  }

  $("newGroupBtn").onclick = function () {
    var me = auth.currentUser;
    modalBox.innerHTML = "<h3>Create a group</h3>";
    var nameBox = document.createElement("input");
    nameBox.type = "text";
    nameBox.placeholder = "Group name";
    modalBox.appendChild(nameBox);

    var checks = [];
    usersList.filter(function (u) { return u.uid != me.uid; }).forEach(function (u) {
      var row = document.createElement("label");
      row.className = "userRow";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = u.uid;
      var span = document.createElement("span");
      span.textContent = u.name;
      row.appendChild(cb);
      row.appendChild(span);
      modalBox.appendChild(row);
      checks.push(cb);
    });

    var createBtn = document.createElement("button");
    createBtn.className = "mainBtn";
    createBtn.style.marginTop = "12px";
    createBtn.textContent = "Create group";
    createBtn.onclick = async function () {
      var groupName = nameBox.value.trim();
      var members = [me.uid], names = {};
      names[me.uid] = me.displayName || me.email;
      checks.forEach(function (cb) {
        if (cb.checked) { members.push(cb.value); names[cb.value] = findUser(cb.value).name; }
      });
      if (groupName == "") { showToast("Please enter a group name"); return; }
      if (members.length < 2) { showToast("Select at least one member"); return; }

      var ref = await addDoc(collection(db, "chats"), { type: "group", name: groupName, members: members, names: names, createdBy: me.uid, pinned: null });
      closeModal();
      openChat({ id: ref.id, type: "group", name: groupName, members: members, names: names, pinned: null });
    };
    modalBox.appendChild(createBtn);
    modal.classList.remove("hidden");
  };

  var replyBar = $("replyBar");
  function setReply(obj) {
    replyTo = obj;
    if (obj) {
      $("replyBarText").textContent = "↩ " + obj.name + ": " + obj.text;
      replyBar.classList.remove("hidden");
      msgInput.focus();
    } else {
      replyBar.classList.add("hidden");
    }
  }
  $("replyCancel").onclick = function () { setReply(null); };

  var typingTimeout = null, lastTypingWrite = 0;
  msgInput.addEventListener("input", function () {
    if (!currentChat) return;
    var now = Date.now();
    if (now - lastTypingWrite > 1500) {   
      saveProfile({ typingIn: currentChat.id, typingAt: now });
      lastTypingWrite = now;
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(function () { saveProfile({ typingIn: "" }); }, 2000);
  });

  var emojis = ["😀","😂","🥰","😍","😎","🤔","😭","😡","👍","🙏","🔥","🎉","❤️","💯","🥳","😴"];
  emojis.forEach(function (e) {
    var s = document.createElement("span");
    s.textContent = e;
    s.onclick = function () { msgInput.value += e; msgInput.focus(); };
    $("emojiBar").appendChild(s);
  });
  $("emojiBtn").onclick = function () { $("emojiBar").classList.toggle("hidden"); };

  var imgFile = $("imgFile");
  $("imgBtn").onclick = function () { imgFile.click(); };
  $("lightbox").onclick = function () { $("lightbox").classList.add("hidden"); };
  imgFile.onchange = function () {
    var file = imgFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 700 / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        sendMessage("", "", canvas.toDataURL("image/jpeg", 0.6));
        showToast("Photo sent 🖼️");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    imgFile.value = "";
  };

  var recorder = null, chunks = [], seconds = 0, timer = null;
  micBtn.onclick = async function () {
    if (recorder && recorder.state == "recording") { recorder.stop(); return; }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: 24000 });   
      chunks = [];
      seconds = 0;
      recorder.ondataavailable = function (e) { chunks.push(e.data); };
      recorder.onstop = function () {
        clearInterval(timer);
        stream.getTracks().forEach(function (t) { t.stop(); });
        micBtn.classList.remove("recording");
        micBtn.textContent = "🎤";
        recText.classList.add("hidden");
        var reader = new FileReader();
        reader.onloadend = function () { sendMessage("", reader.result, ""); showToast("Voice message sent 🎤"); };
        reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType }));
      };
      recorder.start();
      micBtn.classList.add("recording");
      micBtn.textContent = "⏹";
      recText.classList.remove("hidden");
      timer = setInterval(function () {
        seconds++;
        recText.textContent = "⏺ " + seconds + "s";
        if (seconds >= 40) recorder.stop();   
      }, 1000);
    } catch (err) {
      showToast("Please allow microphone access");
    }
  };

  var searchInput = $("searchInput");
  $("searchBtn").onclick = function () {
    $("searchBar").classList.toggle("hidden");
    if ($("searchBar").classList.contains("hidden")) { searchInput.value = ""; applySearch(); }
    else searchInput.focus();
  };
  searchInput.oninput = applySearch;
  function applySearch() {
    var word = searchInput.value.trim().toLowerCase();
    messagesDiv.querySelectorAll(".msg").forEach(function (m) {
      m.style.display = (word == "" || (m.dataset.text || "").includes(word)) ? "" : "none";
    });
  }

  function setWallpaper(n) {
    messagesDiv.className = "wp" + n;
    localStorage.setItem("wallpaper", n);
    document.querySelectorAll(".wallDot").forEach(function (d, i) { d.classList.toggle("active", i == n); });
  }
  for (var i = 0; i < 9; i++) {
    var dot = document.createElement("div");
    dot.className = "wallDot wp" + i;
    dot.onclick = (function (num) { return function () { setWallpaper(num); }; })(i);
    $("wallGrid").appendChild(dot);
  }
  $("wallBtn").onclick = function () { $("wallPanel").classList.toggle("hidden"); };
  setWallpaper(localStorage.getItem("wallpaper") || 0);

  function setDark(on) {
    document.body.classList.toggle("dark", on);
    $("darkBtn").textContent = on ? "☀️" : "🌙";
    localStorage.setItem("dark", on);
  }
  $("darkBtn").onclick = function () { setDark(!document.body.classList.contains("dark")); };
  setDark(localStorage.getItem("dark") == "true");

  function checkOnline() { $("offlineBar").classList.toggle("hidden", navigator.onLine); }
  window.addEventListener("online", checkOnline);
  window.addEventListener("offline", checkOnline);
  checkOnline();

  function playPop() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 700;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  function showToast(text) {
    var old = $("toast");
    if (old) old.remove();
    var t = document.createElement("div");
    t.id = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { 
        t.remove(); 
    }, 2200);
  }