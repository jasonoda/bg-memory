
import gsap from "gsap";
import CryptoJS from 'crypto-js';

export class Scene {

    buildScene() {
        
        this.action="start menu";
        this.count=0;
        
        // Initialize game state
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.totalPairs = 0;
        this.canClick = true;
        this.score = 0;
        this.matches = 0;
        this.gameScores = [];
        this.currentLevel = 1;
        this.gameTime = 150; // 2 minutes in seconds
        this.timeRemaining = this.gameTime;
        this.gameActive = true;
        this.bonusTime = 1; // Bonus multiplier (1 = no bonus)
        this.cardsAnimating = false; // Track if cards are animating in/out
        this.bonusTimeFrozen = false; // Track if bonus time should be frozen
        this.bonusTimeDelay = 0; // Track delay before bonus time starts decaying
        this.bonusMethod="add";
        this.lastBonusScore = 0; // Track when last bonus button was earned
        this.bonusesEarned = 0; // Track total number of bonuses earned
        this.timeBonusActive = false;
        this.eyeBonusActive = false;
        this.x2BonusActive = false;
        this.timeBonusRemaining = 0; // Track time freeze remaining time
        this.x2BonusRemaining = 0; // Track x2 bonus remaining time
        this.lastTickSecond = -1; // Track last second when tick sound was played
        this.pauseKeyPressed = false; // Prevent rapid pause toggling
        
        // Score breakdown tracking
        this.baseScore = 0; // Total base score (matches * 100)
        this.multiplierBonus = 0; // Total multiplier bonus earned
        this.x2Bonus = 0; // Total x2 bonus earned
        this.totalMatches = 0; // Total matches across all levels
        
        // Preload all card images
        this.preloadCardImages();
        
        // Create UI elements
        this.createTimer();
        this.createScoreDisplay();
        this.updateLevelDisplay();
        this.updateBonusDisplay();
        this.updateTimeFreezeDisplay();
        this.updateDebugDisplay();
        
        // Add pause key listener
        this.setupPauseListener();
        
        // Add play button click listener
        this.setupPlayButton();
    }

    preloadCardImages() {
        // Get all available card types from cards folder
        const cardTypes = [
            'axe1.png', 'axe2.png', 'axe3.png', 'axe4.png', 'axe5.png', 'axe6.png', 'axe7.png', 'axe8.png',
            'bow1.png', 'bow2.png', 'bow3.png', 'bow4.png',
            'hammer1.png', 'hammer2.png', 'hammer3.png', 'hammer4.png', 'hammer5.png', 'hammer6.png', 'hammer7.png', 'hammer8.png',
            'kinfe1.png', 'knife2.png', 'knife3.png', 'knife4.png',
            'mace1.png', 'mace2.png', 'mace3.png', 'mace4.png',
            'staff1.png', 'staff2.png', 'staff3.png', 'staff4.png',
            'sword1.png', 'sword2.png', 'sword3.png', 'sword4.png',
            'wand1.png', 'wand2.png', 'wand3.png', 'wand4.png',
            'w75.png', 'w76.png', 'w77.png'
        ];

        // Store loaded images for reuse
        this.loadedImages = new Map();
        this.cardBackLoaded = false;

        // Preload card back image with error handling
        const cardBackImage = new Image();
        cardBackImage.onload = () => {
            console.log('Card back image loaded successfully');
            this.cardBackLoaded = true;
            this.loadedImages.set('cardBack', cardBackImage);
        };
        cardBackImage.onerror = () => {
            console.error('Failed to load card back image');
            this.cardBackLoaded = false;
        };
        cardBackImage.src = 'src/images/cardBack.png';

        // Preload all card front images with error handling
        cardTypes.forEach(cardType => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages.set(cardType, img);
            };
            img.onerror = () => {
                console.error(`Failed to load card image: ${cardType}`);
            };
            img.src = `src/images/cards/${cardType}`;
        });

        console.log(`Preloading ${cardTypes.length + 1} card images...`);
    }

    update() {

        if(this.action==="start menu"){
            // Show start menu - do nothing, wait for play button click
        }else if(this.action==="set up"){
            this.createCardGridForLevel(this.currentLevel);

            this.action="go";

        }else if(this.action==="go"){

            if(this.bonusTime<1){
                this.bonusTime=1;
            }else if(this.bonusTime>5){
                this.bonusTime=5;
            }

            this.updateBonusDisplay();

            // Game is running - update timer using delta time
            if (this.gameActive && this.timeRemaining > 0) {
                // Only subtract time if cards are not animating, bonus is not frozen, and time bonus is not active
                if (!this.cardsAnimating && !this.bonusTimeFrozen && !this.timeBonusActive && !this.eyeBonusActive) {
                    this.timeRemaining -= this.e.dt;
                    this.updateTimerDisplay();
                }
                
                // Update bonus time decay only when game is actively running
                if (this.bonusTime > 1 && this.canClick && !this.cardsAnimating && !this.bonusTimeFrozen && !this.timeBonusActive && !this.eyeBonusActive) {
                    // Handle delay before bonus time starts decaying

                    if(this.bonusMethod==="add"){

                        this.bonusTime -= this.e.dt/6.5;
                       
                    }else if(this.bonusMethod==="cap"){

                        if (this.bonusTimeDelay > 0) {
                            this.bonusTimeDelay -= this.e.dt;
                            // console.log("bonusTimeDelay", this.bonusTimeDelay);
                        } else {
                            // Subtract more when bonus time is high, less when it's low
                            const decayRate = (this.bonusTime - 1) * 0.3; // More decay when bonus time is higher (slower overall)
                            this.bonusTime -= decayRate * this.e.dt;
                            this.bonusTime = Math.max(1, this.bonusTime);
                        }

                    }
                }
                
                // Update bonus countdowns
                this.updateBonusCountdowns();
                
                // Play tick sound when less than 10 seconds remaining
                if (this.timeRemaining <= 10 && this.timeRemaining > 0) {
                    const currentSecond = Math.floor(this.timeRemaining);
                    if (currentSecond !== this.lastTickSecond) {
                        this.e.s.p("tick");
                        this.lastTickSecond = currentSecond;
                    }
                }
                
                if (this.timeRemaining <= 0) {
                    this.action = "end";
                }
            }
            
            // Update time freeze display (should always update, even during animations and when game ends)
            this.updateTimeFreezeDisplay();
        }else if(this.action==="end"){
            this.endGame();
            this.action="ended"
        }else if(this.action==="pause"){
            // Game is paused - do nothing, wait for resume
            // But still update displays
            this.updateTimeFreezeDisplay();
        }

    }

    createCardGrid(x, y) {

        // Create container for the card grid directly
        this.cardContainer = document.createElement('div');
        this.cardContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: clamp(8px, 1.5vw, 15px);
            max-width: 600px;
            width: min(90vw, 600px);
            padding: 0;
            margin: 0;
            line-height: 0;
            align-items: start;
            justify-items: start;
            z-index: 10;
        `;
        
        document.body.appendChild(this.cardContainer);
        
        // Debug info
        setTimeout(() => {
            const cardRect = this.cardContainer.getBoundingClientRect();
        }, 50);
        
        // Debug positioning
        setTimeout(() => {
            const cardRect = this.cardContainer.getBoundingClientRect();
           
            const viewportCenterX = window.innerWidth / 2;
            const viewportCenterY = window.innerHeight / 2;
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const cardCenterY = cardRect.top + cardRect.height / 2;
            
            const offsetY = viewportCenterY - cardCenterY;
            if (Math.abs(offsetY) > 5) {
                this.cardContainer.style.transform = `translate(-50%, calc(-50% + ${offsetY}px))`;
            }
            
        }, 100);
        
        // Fill the grid with cards
        this.cardsAnimating = true;
        this.fillCardGridWithMatches(x * y);
        
        // Center the grid
        this.centerCardGrid();
        
        // console.log("Card grid created with", this.cards.length, "cards");
    }

    createCard(cardType, cardId) {
        // console.log("Creating card", cardId, "with type", cardType);
        
        // Create card container
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.cardId = cardId;
        card.dataset.cardType = cardType;
        card.style.cssText = `
            width: 100%;
            aspect-ratio: 3/4;
            position: relative;
            cursor: pointer;
            perspective: 1000px;
            transform-style: preserve-3d;
            margin: 0;
            padding: 0;
            line-height: 0;
            transform: translateX(${window.innerWidth + 200}px) rotate(-45deg);
        `;
        
        // Create card back (face down)
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        cardBack.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            background-color: white;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            margin: 0;
            padding: 0;
        `;
        // Set card back image with robust fallback
        const cardBackUrl = 'src/images/cardBack.png';
        
        // Check if we have a preloaded image
        if (this.loadedImages && this.loadedImages.has('cardBack')) {
            cardBack.style.backgroundImage = `url('${cardBackUrl}')`;
        } else {
            // Try to load the image with fallback
            cardBack.style.backgroundImage = `url('${cardBackUrl}')`;
            
            // Add error handling for card back image
            const testImage = new Image();
            testImage.onload = () => {
                // Image loaded successfully, ensure it's set
                cardBack.style.backgroundImage = `url('${cardBackUrl}')`;
            };
            testImage.onerror = () => {
                console.error('Card back image failed to load, using fallback');
                // Fallback to a solid color or pattern if image fails
                cardBack.style.backgroundImage = 'none';
                cardBack.style.backgroundColor = '#2c3e50';
                cardBack.style.backgroundImage = 'linear-gradient(45deg, #34495e 25%, transparent 25%), linear-gradient(-45deg, #34495e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #34495e 75%), linear-gradient(-45deg, transparent 75%, #34495e 75%)';
                cardBack.style.backgroundSize = '20px 20px';
                cardBack.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
            };
            testImage.src = cardBackUrl;
        }
        
        // Create card front (face up)
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        cardFront.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            background-color: white;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transform: rotateY(180deg);
            margin: 0;
            padding: 0;
        `;
        // Use path that works for both dev and production
        cardFront.style.backgroundImage = `url('src/images/cards/${cardType}')`;
        // console.log("Set card front image:", `/src/images/cards/${cardType}`);
        
        // Add elements to card
        card.appendChild(cardBack);
        card.appendChild(cardFront);
        
        // Add click event
        card.addEventListener('click', () => this.handleCardClick(card));
        
        // Store card reference
        this.cards.push({
            element: card,
            type: cardType,
            id: cardId,
            isFlipped: false,
            isMatched: false
        });
        
        return card;
    }

    fillCardGridWithMatches(totalCards) {
        // Get all available card types from the cards folder
        const cardTypes = [
            'axe1.png', 'axe2.png', 'axe3.png', 'axe4.png', 'axe5.png', 'axe6.png', 'axe7.png', 'axe8.png',
            'bow1.png', 'bow2.png', 'bow3.png', 'bow4.png',
            'hammer1.png', 'hammer2.png', 'hammer3.png', 'hammer4.png', 'hammer5.png', 'hammer6.png', 'hammer7.png', 'hammer8.png',
            'kinfe1.png', 'knife2.png', 'knife3.png', 'knife4.png',
            'mace1.png', 'mace2.png', 'mace3.png', 'mace4.png',
            'staff1.png', 'staff2.png', 'staff3.png', 'staff4.png',
            'sword1.png', 'sword2.png', 'sword3.png', 'sword4.png',
            'wand1.png', 'wand2.png', 'wand3.png', 'wand4.png',
            'w75.png', 'w76.png', 'w77.png'
        ];
        
        // Select random card types for pairs
        const selectedTypes = [];
        const pairsNeeded = totalCards / 2;
        
        for (let i = 0; i < pairsNeeded; i++) {
            const randomIndex = Math.floor(Math.random() * cardTypes.length);
            const cardType = cardTypes[randomIndex];
            selectedTypes.push(cardType);
            cardTypes.splice(randomIndex, 1); // Remove to avoid duplicates
        }
        
        // Create pairs of cards
        const cardPairs = [];
        for (let i = 0; i < selectedTypes.length; i++) {
            cardPairs.push(selectedTypes[i], selectedTypes[i]); // Add each type twice
        }
        
        // Shuffle the cards
        for (let i = cardPairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
        }

        this.e.s.p("woosh1");
        
        // Create and add cards to grid with animation
        for (let i = 0; i < cardPairs.length; i++) {
            const cardElement = this.createCard(cardPairs[i], i);
            this.cardContainer.appendChild(cardElement);
            
            // Animate card entrance
            gsap.to(cardElement, {
                x: 0,
                rotation: 0,
                duration: 0.5,
                delay: (i * 0.05),
                ease: "sine.inOut",
                onComplete: () => {
                    // Play flip1 sound at the end of each card animation
                    // this.e.s.p("flip3");
                    
                    // Set cardsAnimating to false after the last card animation completes
                    if (i === cardPairs.length - 1) {
                        this.cardsAnimating = false;
                    }
                }
            });
        }
        
        this.totalPairs = pairsNeeded;
    }

    centerCardGrid() {
        // The grid is already centered with CSS, but we can add additional styling
        this.cardContainer.style.marginTop = '50px';
    }

    handleCardClick(cardElement) {
        if (!this.canClick) return;
        
        const cardId = parseInt(cardElement.dataset.cardId);
        const card = this.cards.find(c => c.id === cardId);
        
        if (!card || card.isFlipped || card.isMatched) return;
        
        // Flip the card
        this.flipCard(card);
        
        // Add to flipped cards
        this.flippedCards.push(card);
        
        // Check if we have 2 cards flipped
        if (this.flippedCards.length === 2) {
            this.canClick = false;
            
            // Check for match
            if (this.flippedCards[0].type === this.flippedCards[1].type) {
                // Match found
                this.handleMatch();
            } else {
                // No match - flip back after delay
                setTimeout(() => {
                    this.handleNoMatch();
                }, 500); // Reduced from 0.75 to 0.5 seconds
            }
        }
    }

    flipCard(card) {
        card.isFlipped = true;
        
        // Play flip sound
        this.e.s.p("flip1");
        
        // Animate the flip
        gsap.to(card.element, {
            rotationY: 180,
            duration: 0.1,
            ease: "power2.out"
        });
    }

    flipCardBack(card) {
        card.isFlipped = false;
        
        // Play flip back sound
        this.e.s.p("flip2");
        
        // Animate the flip back
        gsap.to(card.element, {
            rotationY: 0,
            duration: 0.1,
            ease: "power2.out"
        });
    }

    handleMatch() {
        // Mark cards as matched
        this.flippedCards.forEach(card => {
            card.isMatched = true;
        });
        
        // Update game state
        this.matchedPairs++;
        this.matches++;
        this.totalMatches++;
        
        // Calculate base score and bonuses
        let basePoints = 100; // Base points per match
        let multiplierPoints = Math.round(100 * (this.bonusTime - 1)); // Bonus from multiplier
        let totalPoints = basePoints + multiplierPoints;
        
        // Track score breakdown
        this.baseScore += basePoints;
        this.multiplierBonus += multiplierPoints;
        
        // Apply x2 bonus if active
        if (this.x2BonusActive) {
            let x2BonusAmount = totalPoints; // The extra points from x2
            this.x2Bonus += x2BonusAmount;
            totalPoints *= 2;
        }
        
        this.score += totalPoints;
        this.e.s.p("coin")
        
        // Show score popup
        this.showScorePopup(totalPoints);
        
        // Check if player earned a bonus button
        this.checkForBonusButton();

        if(this.bonusMethod==="add"){
            this.bonusTime+=.5;
        }else if(this.bonusMethod==="cap"){
            this.bonusTime = 2;
            this.bonusTimeDelay = 2; // 0.2 second delay before bonus time starts decaying
        }
        
        // if all matches on the grid are matched, stop the subtraction of the bonus time
        if (this.matchedPairs >= this.totalPairs) {
            this.bonusTimeFrozen = true;
        }
        
        // Update displays
        this.updateScoreDisplay();
        this.updateBonusDisplay();
        this.updateDebugDisplay();
        
        // Clear flipped cards
        this.flippedCards = [];
        this.canClick = true;
        
        // Check if game is complete
        if (this.matchedPairs === this.totalPairs) {
            this.handleGameComplete();
        }
    }

    handleNoMatch() {
        // Flip cards back
        this.flippedCards.forEach(card => {
            this.flipCardBack(card);
        });
        
        // Penalty for wrong match - subtract 0.1 from bonus time
        // this.bonusTime-=0.2;
        // this.bonusTime = Math.max(1, this.bonusTime - 0.1);
        // this.bonusTimeDelay = 0.5;
        this.updateBonusDisplay();
        
        // Clear flipped cards
        this.flippedCards = [];
        this.canClick = true;
    }

    handleGameComplete() {
        // Level completed logic
        this.gameScores.push(this.score);
        
        // Play achievement sound
        this.e.s.p("achievement1");
        
        // Set fader to 0.5 opacity and tween it down to 0 after 0.5 seconds
        const fader = document.getElementById('fader');
        if (fader) {
            fader.style.opacity = '0.5';
            
            // Tween the fader down to 0 after 0.5 seconds
            setTimeout(() => {
                gsap.to(fader, {
                    opacity: 0,
                    duration: 0.5,
                    ease: "sine.inOut"
                });
            }, 500);
        }
        
        // Animate cards out to the left after 0.75 seconds
        setTimeout(() => {
            this.animateCardsOut();
        }, 750);
    }
    
    animateCardsOut() {
        // Set cards as animating
        this.cardsAnimating = true;
        
        // Allow cards to animate off-screen
        document.documentElement.classList.add('animating-cards-out');
        document.body.classList.add('animating-cards-out');
        
        // Ensure card container doesn't clip the cards during animation
        if (this.cardContainer) {
            this.cardContainer.style.overflow = 'visible';
            this.cardContainer.style.position = 'fixed';
            this.cardContainer.style.zIndex = '1000';
        }
        
        // Animate all cards out to the left
        this.cards.forEach((card, index) => {
            // Ensure card stays visible during animation
            card.element.style.position = 'relative';
            card.element.style.zIndex = '1001';
            card.element.style.backfaceVisibility = 'visible';
            
            gsap.to(card.element, {
                x: -window.innerWidth - 500, // Move further off-screen
                rotation: 45,
                duration: 0.8, // Longer duration to ensure visibility
                delay: index * 0.02,
                ease: "sine.inOut",
                onComplete: () => {
                    if (index === this.cards.length - 1) {
                        // Remove the class and start next level after all cards have animated out
                        document.documentElement.classList.remove('animating-cards-out');
                        document.body.classList.remove('animating-cards-out');
                        this.cardsAnimating = false;
                        this.startNextLevel();
                    }
                }
            });
        });
    }
    
    startNextLevel() {
        // Clear current grid
        if (this.cardContainer) {
            this.cardContainer.remove();
        }
        
        // Reset game state for next level (but keep score and timer)
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.totalPairs = 0;
        this.canClick = true;
        this.matches = 0;
        this.bonusTimeFrozen = false; // Reset bonus time freeze for new level
        this.bonusTimeDelay = 0; // Reset bonus time delay for new level
        // Timer continues running between levels
        
        // Increment level
        this.currentLevel++;
        
        // Update level display
        this.updateLevelDisplay();
        
        // Start next level
        this.action = "set up";
    }
    
    createCardGridForLevel(level) {
        let rows, cols;
        
        // Determine grid size based on level
        if (level === 1) {
            rows = 2; cols = 4;
        } else if (level === 2 || level === 3) {
            rows = 3; cols = 4;
        } else {
            rows = 4; cols = 4;
        }
        
        this.createCardGrid(cols, rows);
    }
    
    createTimer() {
        // Get new timer element
        this.timerElement = document.getElementById('timeDisplay');
        this.updateTimerDisplay();
    }
    
    createScoreDisplay() {
        // Get new score element
        this.scoreElement = document.getElementById('scoreDisplay');
        this.updateScoreDisplay();
    }
    

    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateScoreDisplay() {
        this.scoreElement.textContent = this.score;
    }
    
    updateDebugDisplay() {
        const debugMatches = document.getElementById('debugMatches');
        const debugBaseScore = document.getElementById('debugBaseScore');
        const debugMultiplierBonus = document.getElementById('debugMultiplierBonus');
        const debugX2Bonus = document.getElementById('debugX2Bonus');
        const debugTotalScore = document.getElementById('debugTotalScore');
        
        if (debugMatches) debugMatches.textContent = `${this.matches} (Total: ${this.totalMatches})`;
        if (debugBaseScore) debugBaseScore.textContent = this.baseScore;
        if (debugMultiplierBonus) debugMultiplierBonus.textContent = this.multiplierBonus;
        if (debugX2Bonus) debugX2Bonus.textContent = this.x2Bonus;
        if (debugTotalScore) debugTotalScore.textContent = this.score;
    }
    
    updateLevelDisplay() {
        const levelElement = document.getElementById('levelDiv');
        if (levelElement) {
            levelElement.textContent = `LEVEL: ${this.currentLevel}`;
        }
    }
    
    updateBonusDisplay() {
        const bonusDisplay = document.getElementById('bonusDisplay');
        const bonusBackground = document.getElementById('bonusBackground');
        
        if (bonusDisplay) {
            bonusDisplay.textContent = `BONUS: x${this.bonusTime.toFixed(1)}`;
        }
        
        if (bonusBackground) {
            // Calculate scale: 1 = 0%, 5 = 100%
            const scalePercent = ((this.bonusTime - 1) / 4) * 100;
            bonusBackground.style.transform = `scaleY(${Math.max(0, Math.min(1, scalePercent / 100))})`;
        }
    }
    
    showScorePopup(points) {
        const scorePopup = document.getElementById('scorePopup');
        if (scorePopup) {
            scorePopup.textContent = `+${points}`;
            scorePopup.style.opacity = '1';
            scorePopup.style.transform = 'translate(-50%, -50%) scale(1)';
            
            // Animate: grow slightly then fade out
            setTimeout(() => {
                scorePopup.style.transform = 'translate(-50%, -50%) scale(1.2)';
            }, 150);
            
            setTimeout(() => {
                scorePopup.style.opacity = '0';
                scorePopup.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 800);
        }
    }
    
    updateBonusCountdowns() {
        // Update time freeze countdown
        if (this.timeBonusActive && this.timeBonusRemaining > 0) {
            // Only countdown if not animating cards and not during eye bonus
            if (!this.cardsAnimating && !this.eyeBonusActive) {
                this.timeBonusRemaining -= this.e.dt;
            }
            
            // Check if time freeze has expired
            if (this.timeBonusRemaining <= 0) {
                this.timeBonusActive = false;
                this.timeBonusRemaining = 0;
            }
        }
        
        // Update x2 bonus countdown
        if (this.x2BonusActive && this.x2BonusRemaining > 0) {
            // Only countdown if not animating cards and not during eye bonus
            if (!this.cardsAnimating && !this.eyeBonusActive) {
                this.x2BonusRemaining -= this.e.dt;
            }
            
            // Check if x2 bonus has expired
            if (this.x2BonusRemaining <= 0) {
                this.x2BonusActive = false;
                this.x2BonusRemaining = 0;
            }
        }
    }
    
    updateTimeFreezeDisplay() {
        const timeFreezeDisplay = document.getElementById('timeFreezeDisplay');
        const x2BonusDisplay = document.getElementById('x2BonusDisplay');
        
        // Update time freeze display
        if (timeFreezeDisplay) {
            if (this.timeBonusActive) {
                const timeLeft = Math.ceil(this.timeBonusRemaining);
                timeFreezeDisplay.textContent = `TIME FROZEN: ${Math.max(0, timeLeft)}`;
                timeFreezeDisplay.style.opacity = '1';
            } else {
                timeFreezeDisplay.style.opacity = '0';
            }
        }
        
        // Update x2 bonus display
        if (x2BonusDisplay) {
            if (this.x2BonusActive) {
                const timeLeft = Math.ceil(this.x2BonusRemaining);
                x2BonusDisplay.textContent = `DOUBLE POINTS: ${Math.max(0, timeLeft)}`;
                x2BonusDisplay.style.opacity = '1';
            } else {
                x2BonusDisplay.style.opacity = '0';
            }
        }
        
        // Adjust positioning when both are active
        this.adjustBonusDisplayPositions();
    }
    
    adjustBonusDisplayPositions() {
        const timeFreezeDisplay = document.getElementById('timeFreezeDisplay');
        const x2BonusDisplay = document.getElementById('x2BonusDisplay');
        
        if (timeFreezeDisplay && x2BonusDisplay) {
            const timeActive = this.timeBonusActive;
            const x2Active = this.x2BonusActive;
            
            if (timeActive && x2Active) {
                // Both active - stack them with space between
                timeFreezeDisplay.style.top = '80px';
                x2BonusDisplay.style.top = '110px';
            } else if (timeActive) {
                // Only time freeze active
                timeFreezeDisplay.style.top = '80px';
                x2BonusDisplay.style.top = '110px';
            } else if (x2Active) {
                // Only x2 bonus active
                timeFreezeDisplay.style.top = '80px';
                x2BonusDisplay.style.top = '80px';
            } else {
                // Neither active - reset to default positions
                timeFreezeDisplay.style.top = '80px';
                x2BonusDisplay.style.top = '110px';
            }
        }
    }
    
    checkForBonusButton() {
        // Determine the required points based on how many bonuses have been earned
        let requiredPoints;
        if (this.bonusesEarned < 5) {
            // First 5 bonuses: every 1000 points
            requiredPoints = 1000;
        } else {
            // After 5 bonuses: every 2000 points
            requiredPoints = 2000;
        }
        
        // Check if player earned a bonus button
        if (this.score >= this.lastBonusScore + requiredPoints) {
            this.lastBonusScore = this.score;
            this.bonusesEarned++;
            this.addRandomBonusButton();
        }
    }
    
    addRandomBonusButton() {
        // Check if we already have 3 bonus buttons (limit)
        const container = document.getElementById('bonusButtonContainer');
        if (container && container.children.length >= 3) {
            return; // Don't add more if we already have 3
        }
        
        const bonusTypes = ['timeBonus', 'eyeBonus', 'x2Bonus'];
        const randomType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        
        const bonusButton = document.createElement('img');
        bonusButton.className = 'bonusButton';
        bonusButton.dataset.type = randomType;
        
        // Set image based on type
        switch(randomType) {
            case 'timeBonus':
                bonusButton.src = 'src/images/bonus_clock.png';
                break;
            case 'eyeBonus':
                bonusButton.src = 'src/images/bonus_eye.png';
                break;
            case 'x2Bonus':
                bonusButton.src = 'src/images/bonus_x2.png';
                break;
        }
        
        // Add click handler
        bonusButton.addEventListener('click', () => {
            this.useBonusButton(bonusButton, randomType);
        });
        
        // Add to container
        if (container) {
            container.appendChild(bonusButton);
        }
    }
    
    useBonusButton(button, type) {
        // Play bonus sound
        
        
        // Remove the button
        button.remove();
        
        // Handle different bonus types
        switch(type) {
            case 'timeBonus':
                this.e.s.p("agSpell_magic");
                this.activateTimeBonus();
                break;
            case 'eyeBonus':
                this.e.s.p("answerlens");
                this.activateEyeBonus();
                break;
            case 'x2Bonus':
                this.e.s.p("bonus1");
                this.activateX2Bonus();
                break;
        }
    }
    
    activateTimeBonus() {
        // Add 10 seconds and pause time/bonus decay
        // this.timeRemaining += 10;
        this.updateTimerDisplay();
        
        // Play time bonus sound
        
        
        // Set flags to pause decay
        this.timeBonusActive = true;
        this.timeBonusRemaining = 10; // 10 seconds
        
        // Update time freeze display
        this.updateTimeFreezeDisplay();
    }
    
    activateEyeBonus() {
        // Reveal all cards for 2.25 seconds (25% less than 3 seconds)
        this.cards.forEach(card => {
            if (!card.isMatched) {
                card.element.style.transform = 'rotateY(180deg)';
            }
        });
        
        // Play eye bonus sound
        
        
        // Pause time/bonus decay during reveal
        this.eyeBonusActive = true;
        
        // Hide cards and resume decay after 2.25 seconds
        setTimeout(() => {
            this.cards.forEach(card => {
                if (!card.isMatched && !card.isFlipped) {
                    card.element.style.transform = 'rotateY(0deg)';
                }
            });
            this.eyeBonusActive = false;
        }, 2250);
    }
    
    activateX2Bonus() {
        // Activate 2x points for 10 seconds
        this.x2BonusActive = true;
        this.x2BonusRemaining = 10; // 10 seconds
        
        // Update x2 bonus display
        this.updateTimeFreezeDisplay();
    }
    
    revealAllCards() {
        // Temporarily show all cards
        this.cards.forEach(card => {
            if (!card.isMatched) {
                card.element.style.transform = 'rotateY(180deg)';
            }
        });
        
        // Hide them after 2 seconds
        setTimeout(() => {
            this.cards.forEach(card => {
                if (!card.isMatched && !card.isFlipped) {
                    card.element.style.transform = 'rotateY(0deg)';
                }
            });
        }, 2000);
    }
    
    setupPlayButton() {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            // Remove any existing event listeners
            playButton.removeEventListener('click', this.playButtonHandler);
            
            // Create the event handler function
            this.playButtonHandler = () => {
                if (this.action === "start menu") {
                    // Play start sounds
                    this.e.s.p("brightClick");
                    // this.e.s.p("getMem");
                    
                    // Fade out start menu
                    const startMenuContainer = document.getElementById('startMenuContainer');
                    if (startMenuContainer) {
                        startMenuContainer.style.opacity = '0';
                        
                        // After fade out, hide menu and start game
                        setTimeout(() => {
                            const startMenu = document.getElementById('startMenu');
                            if (startMenu) {
                                startMenu.style.display = 'none';
                            }
                            
                            // Start the game with a small delay for smooth transition
                            setTimeout(() => {
                                this.action = "set up";
                            }, 100);
                        }, 500); // Match the CSS transition duration
                    }
                }
            };
            
            // Add the event listener
            playButton.addEventListener('click', this.playButtonHandler);
        }
        
        // Setup instructions button
        this.setupInstructionsButton();
    }
    
    setupInstructionsButton() {
        console.log("setupInstructionsButton");
        const instructionsButton = document.getElementById('instructionsButton');
        const closeInstructionsButton = document.getElementById('closeInstructionsButton');
        const instructionsOverlay = document.getElementById('instructionsOverlay');
        
        if (instructionsButton) {
            instructionsButton.addEventListener('click', () => {
                this.e.s.p("click");
                console.log("instructionsButton clicked");
                if (instructionsOverlay) {
                    instructionsOverlay.style.display = 'flex';
                }
            });
        }
        
        if (closeInstructionsButton) {
            closeInstructionsButton.addEventListener('click', () => {
                this.e.s.p("click");
                if (instructionsOverlay) {
                    instructionsOverlay.style.display = 'none';
                }
            });
        }
        
        // Close overlay when clicking outside of it
        if (instructionsOverlay) {
            instructionsOverlay.addEventListener('click', (e) => {
                if (e.target === instructionsOverlay) {
                    instructionsOverlay.style.display = 'none';
                }
            });
        }
    }
    
    setupPauseListener() {
        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 'p' && !this.pauseKeyPressed) {
                this.pauseKeyPressed = true;
                
                if (this.action === "go") {
                    this.action = "pause";
                } else if (this.action === "pause") {
                    this.action = "go";
                }
            }
        });
        
        document.addEventListener('keyup', (event) => {
            if (event.key.toLowerCase() === 'p') {
                this.pauseKeyPressed = false;
            }
        });
    }
    

    
    endGame() {
        this.gameActive = false;
        
        // Play finish sound effect
        this.e.s.p("transitionLogo");
        this.e.s.p("achievement1");
        
        // Create game over screen
        this.showGameOverScreen();
    }
    
    showGameOverScreen() {
        // Hide the card grid
        if (this.cardContainer) {
            this.cardContainer.style.display = 'none';
        }
        
        // Hide all bonus-related elements
        const bonusDiv = document.getElementById('bonusDiv');
        if (bonusDiv) {
            bonusDiv.style.display = 'none';
        }
        
        const bonusButtonContainer = document.getElementById('bonusButtonContainer');
        if (bonusButtonContainer) {
            bonusButtonContainer.style.display = 'none';
        }
        
        const bonusDisplay = document.getElementById('bonusDisplay');
        if (bonusDisplay) {
            bonusDisplay.style.display = 'none';
        }
        
        const x2BonusDisplay = document.getElementById('x2BonusDisplay');
        if (x2BonusDisplay) {
            x2BonusDisplay.style.display = 'none';
        }
        
        const timeFreezeDisplay = document.getElementById('timeFreezeDisplay');
        if (timeFreezeDisplay) {
            timeFreezeDisplay.style.display = 'none';
        }
        
        const bonusBackground = document.getElementById('bonusBackground');
        if (bonusBackground) {
            bonusBackground.style.display = 'none';
        }
        
        // Calculate score breakdown
        const matchesScore = this.totalMatches * 100;
        const multiplierBonus = this.multiplierBonus;
        const x2Bonus = this.x2Bonus;
        const levelReached = this.currentLevel - 1;
        
        // Create stats array for endScore
        const statsArray = [
            ['Number of Matches', `${this.totalMatches} (${matchesScore})`],
            ['Match Multiplier Bonus', multiplierBonus],
            ['x2 Bonus', x2Bonus],
            ['Level Reached', levelReached]
        ];
        
        // Use the new endScore system
        this.e.endScore.createFinalScoreOverlay(this.score, statsArray);
    }
    
    restartGame() {
        // Hide final score screen
       
        // Reset progress bar
        const progressBarFill = document.getElementById('progressBarFill');
        if (progressBarFill) {
            progressBarFill.style.width = '0%';
        }
        
        // Clear card container
        if (this.cardContainer) {
            this.cardContainer.remove();
        }
        
        // Reset game state
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.totalPairs = 0;
        this.canClick = true;
        this.score = 0;
        this.matches = 0;
        this.gameScores = [];
        this.currentLevel = 1;
        this.timeRemaining = this.gameTime;
        this.gameActive = true;
        this.bonusTime = 1;
        this.cardsAnimating = false;
        this.bonusTimeFrozen = false;
        this.bonusTimeDelay = 0;
        this.pauseKeyPressed = false;
        this.lastBonusScore = 0;
        this.bonusesEarned = 0;
        this.timeBonusActive = false;
        this.eyeBonusActive = false;
        this.x2BonusActive = false;
        this.timeBonusRemaining = 0;
        this.x2BonusRemaining = 0;
        this.lastTickSecond = -1;
        
        // Reset score breakdown
        this.baseScore = 0;
        this.multiplierBonus = 0;
        this.x2Bonus = 0;
        this.totalMatches = 0;
        
        // Clear bonus buttons
        const bonusContainer = document.getElementById('bonusButtonContainer');
        if (bonusContainer) {
            bonusContainer.innerHTML = '';
        }
        
        // Restart timer and UI
        this.createTimer();
        this.createScoreDisplay();
        this.updateLevelDisplay();
        this.updateTimeFreezeDisplay();
        this.updateDebugDisplay();
        
        // Show start menu
        const startMenu = document.getElementById('startMenu');
        const startMenuContainer = document.getElementById('startMenuContainer');
        if (startMenu) {
            startMenu.style.display = 'flex';
        }
        if (startMenuContainer) {
            startMenuContainer.style.opacity = '1';
        }
        
        // Start new game
        this.action = "start menu";
    }

    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------

    // This is MESSAGE_FACTORY (I am obfuscating the name)
    _0x8db29a(name, data) {
        return JSON.stringify({
        type: name,
        data: data,
        });
    }

    setUp(e) {
        this.e = e;

        /**
        * Obfuscate a plaintext string with a simple rotation algorithm similar to
        * the rot13 cipher.
        * @param  {[type]} key rotation index between 0 and n
        * @param  {Number} n   maximum char that will be affected by the algorithm
        * @return {[type]}     obfuscated string
        */
        String.prototype._0x083c9db = function(key, n = 126) {
        // return String itself if the given parameters are invalid
        if (!(typeof(key) === 'number' && key % 1 === 0)
            || !(typeof(key) === 'number' && key % 1 === 0)) {
            return this.toString();
        }

        var chars = this.toString().split('');

        for (var i = 0; i < chars.length; i++) {
            var c = chars[i].charCodeAt(0);

            if (c <= n) {
            chars[i] = String.fromCharCode((chars[i].charCodeAt(0) + key) % n);
            }
        }

        return chars.join('');
        };

        /**
        * De-obfuscate an obfuscated string with the method above.
        * @param  {[type]} key rotation index between 0 and n
        * @param  {Number} n   same number that was used for obfuscation
        * @return {[type]}     plaintext string
        */
        String.prototype._0xd7a82c = function(key, n = 126) {
        // return String itself if the given parameters are invalid
        if (!(typeof(key) === 'number' && key % 1 === 0)
            || !(typeof(key) === 'number' && key % 1 === 0)) {
            return this.toString();
        }

        return this.toString()._0x083c9db(n - key);
        };

    }

    resetBreadCrumbTempData(){

        //reset every level

        this.levelScore=0;
        this.levelStartTime = performance.now();

    }

    breadCrumb(type){

        console.log("---------BREADCRUMB----------------------------------------------------------");

        if (typeof CryptoJS !== 'undefined') {

        this.levelElapsedTime = (performance.now() - this.levelStartTime) / 1000;
        console.log("Level duration (in seconds):", this.levelElapsedTime);

        const breadCrumbPayload = {

            currentScore: this.score,
            levelScore: this.levelScore,
            levelTime: this.levelElapsedTime,
            matches: this.matches,
            part: this.part,
            gameScores: this.gameScores,
            clientTimestamp: Date.now()

        }

        if (type==="validate") {

            //---------------------------------------------------------------------------------------------------------------------
            //----END GAME VALIDATE------------------------------------------------------------------------------------------------
            //---------------------------------------------------------------------------------------------------------------------

            const finalPayload = {

                score: this.score,
                matches: this.matches,
                gameScores: this.gameScores,
                metadata: {
                    breadcrumb: breadCrumbPayload,
                }

            };

            try {

                var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(finalPayload), 'DrErDE?F:nEsF:AA=A:EEDB:>C?nAABA@r>E'._0xd7a82c(13)).toString();
                const message = JSON.stringify({ type: 'Sv{ny`p|r'._0xd7a82c(13), data: ciphertext });
                if (window.parent) {
                    window.parent.postMessage(message, "*")
                } else {
                    console.log(`no parent`);
                }

                } catch {

                console.log('Not configured properly');

            }

            this.breadCrumbDone = true;

        } else {

            //---------------------------------------------------------------------------------------------------------------------
            //----BREAD CRUMB------------------------------------------------------------------------------------------------------
            //---------------------------------------------------------------------------------------------------------------------

            try {

            var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(breadCrumbPayload), 'DrErDE?F:nEsF:AA=A:EEDB:>C?nAABA@r>E'._0xd7a82c(13)).toString();
            var message = JSON.stringify({type: 'OrnqPzo'._0xd7a82c(13), data: ciphertext});
            if (window.parent) {
                window.parent.postMessage(message, "*");
            } else {
                console.log('no parent');
            }

            } catch {

            console.log('Not configured properly');

            }

        }

        } else {

            console.log('CryptoJS is not defined');

        }

        //---------------------------------------------------------------------------------------------------------------------
        //---------------------------------------------------------------------------------------------------------------------
        //---------------------------------------------------------------------------------------------------------------------

        this.resetBreadCrumbTempData();

    }

}