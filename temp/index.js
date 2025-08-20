import './main.css';
import './shared.css';

import Engine from "./engine.js"; 
import { Input } from "./input.js";
import { Loader } from "./loader.js";
import { Scene } from "./scene.js";
import { Sounds } from "./sounds.js";
import { Utilities } from "./u.js";
import { UI } from "./ui.js";
import { EndScore } from "./endScore.js";

var input = new Input();
var loader = new Loader();
var scene = new Scene();
var sounds = new Sounds();
var utilities = new Utilities();
var ui = new UI();
var endScore = new EndScore();

var engine = new Engine(input,loader,scene,sounds,utilities,ui,endScore);
  
ui.setUp(engine);
utilities.setUp(engine);
loader.setUp(engine);
scene.setUp(engine);
sounds.setUp(engine);
input.setUp(engine);
endScore.setUp(engine);
  
engine.start(engine);

function update() {
    engine.update();
    requestAnimationFrame(update);
}
  
requestAnimationFrame(update);
