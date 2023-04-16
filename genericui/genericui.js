/*
TODO:
  allow batched updatePanels
  allow postponed initialization
  allow customization
  allow piggybacking off existing panels instead of overriding (treat each panel as a container for children instead of container for all content)
*/

window.genericUI = function() {
  window.rhiza.loadStylesheet('genericUI', 'https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.3/genericui/main.css');

  class TransientRenderState {
    constructor(panelNameList) {
      this.panelsAsList = [];
      this.panelsByName = {};
      
      for (let panelName of panelNameList) {
        this.getPanel(panelName);
      }
    }
    
    getPanel(name) {
      let panel = this.panelsByName[name];
      if (!panel) {
        panel = {
          name: "portrait",
          content: null,
        };
        this.panelsByName[name] = panel;
        this.panelsAsList.push(panel);
      }
      return panel;
    }
  
    appendToPanel(name, content) {
      let panel = this.getPanel(name);
      if (panel.content == null) {
        panel.content = content;
      } else {
        panel.content += content;
      }
    }
  };

  let defaultPanelNames = [
    "portrait",
  ];

  function renderUI(plugins) {
    let renderState = new TransientRenderState(defaultPanelNames);

    for (let p of plugins) {
      let renderer = p.render;
      if (renderer) {
        renderer(renderState);
      }
    }

    let m = "<div class='genericui-grid'>";

    for (let {name, content} of renderState.panelsAsList) {
      if (content == null) {
        continue;
      }

      m += "<div class='genericui-panel'>" + content + "</div>";
    }

    m += "</div>";

    document.body.innerHTML = m;
  }
  
  function initialize() {
    document.body.classList.add("genericui-body");
    oc.window.show();
  }
  
  let p = { initialize, renderUI };

  window.rhiza.registerPlugin("GenericUI", p);
  
  return p;
}();


