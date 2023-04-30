window.config.wakeMeUpInside = {
  minSecondsToAlert: 10,
  audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_b21a079c8f.mp3?filename=service-bell-ring-14610.mp3",
  onStart: true,
}


window.wakeMeUpInside = function() {
  let lastMessageEndTimestamp = null;
  let waitingForMessage = true;
  let audio = new Audio();

  const renderPanelName = "warnings";

  function initialize() {
    window.rhiza.requireMediaPermission();
    lastMessageEndTimestamp = Date.now();
    audio.src = window.config.wakeMeUpInside.audioUrl;
  }

  function playIfNecessary() {
    if (waitingForMessage) {
      let delta = Date.now() - lastMessageEndTimestamp;
      if (delta / 1000 >= window.config.wakeMeUpInside.minSecondsToAlert) {
        audio.play();
      }
    }
    waitingForMessage = false;
  }

  function onMessageAdded() {
    let message = oc.thread.messages.at(-1);
    if (message.author == "user") {
      waitingForMessage = true;
      lastMessageEndTimestamp = Date.now();
    } else if (!window.config.wakeMeUpInside.onStart) {
      playIfNecessary();
    }
  }

  function onStreamingMessage(data) {
    if (window.config.wakeMeUpInside.onStart) {
      playIfNecessary();
    }
  }

  let p = { initialize, onMessageAdded, onStreamingMessage };

  window.rhiza.registerPlugin("wakeMeUpInside", p);

  return p;
}();

