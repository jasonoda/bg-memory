import { Howl } from 'howler';
export class Sounds {

    setUp(e) {

        this.e=e;
        this.soundArray = ["click", "finish", "match", "pickup", "place", "start", "tick", "cancelDrum", "bonus1", "firstMega", "loseStreak", "startBeep1", "startBeep2", "coin", "achievement1", "brightClick", "flip1", "woosh1", "wrongBuzzer"];
        this.loadedSounds = [];

        for(var i=0; i<this.soundArray.length; i++){
            this.loadSounds(this.soundArray[i]);
        }
        
    }

    loadSounds(url){

        var theSound = new Howl({
            src: ['src/sounds/'+url+".mp3"]
        });

        theSound.on('load', (event) => {
            theSound.name=url;
            this.loadedSounds.push(theSound);
            // console.log("SOUND: "+url+" - "+this.loadedSounds.length+" / "+this.soundArray.length);
        });

    }

    p(type){

        // console.log(this.e.soundOn+" / "+type)

        // if(this.e.soundOn===true){
            for(var i=0; i<this.loadedSounds.length; i++){

                // console.log(type+" / "+this.loadedSounds[i].name)

                if(this.loadedSounds[i].name===type){
                    // console.log("-->"+type)
                    this.loadedSounds[i].play();
                }
                
            }
        // }

    }
}