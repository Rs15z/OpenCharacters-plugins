# Plugins

Alarm for messages that take too long to generate.
Please click the little message in the iframe after your character is loaded, so the custom code is allowed to play media.

Example usage:
```js
await import('https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.4/rhiza/rhiza.js');

await import('https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.4/genericui/genericui.js');
await import('https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.4/wakemeupinside/wakemeupinside.js');

window.config.wakeMeUpInside = {
  minSecondsToAlert: 5,
  audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_b21a079c8f.mp3?filename=service-bell-ring-14610.mp3",
  onStart: true,
}

window.rhiza.initialize();
```

This will alert you with the linked tune when the message will start to generate, if preparing the message took 5 seconds or more.
