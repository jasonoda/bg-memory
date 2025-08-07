
import gsap from "gsap";
import CryptoJS from 'crypto-js';

export class Scene {

    buildScene() {
        
        this.action = "set up";
        
        // Game state
        this.gameAction = "waiting"; // Start in waiting state, not new round
        this.gameTime = 120; // 2:00 in seconds
        this.score = 0;
        this.currentCards = [];
        this.cardElements = []; // Array to track card DOM elements
        this.cardValue = 0;
        this.bustText = null;
        this.dealingCard = false;
        this.initialDealAnimationTriggered = false;
        this.bonusMult = 1; // Bonus multiplier, max 5
        
        // Game statistics tracking
        this.score21 = 0;
        this.score20 = 0;
        this.score19 = 0;
        this.score18 = 0;
        this.score17 = 0;
        this.score16 = 0;
        this.cardPoints = 0; // Points before bonus multiplier
        this.multBonus = 0; // Points from bonus multiplier
        this.bustCount = 0;
        this.handCount = 0; // Number of hands played

        // Initialize timer display
        this.updateTimer();
        
        // Ensure timer is visible from the start
        const timerDiv = document.getElementById('timerDiv');
        if (timerDiv) {
            timerDiv.style.opacity = '1';
            timerDiv.style.visibility = 'visible';
            timerDiv.style.display = 'block';
            console.log('Timer initialized with:', timerDiv.textContent);
        }
        
        // Initialize score display
        const scoreDiv = document.getElementById('scoreDiv');
        if (scoreDiv) {
            scoreDiv.textContent = '0';
        }
        
        // Initialize bonus displays
        this.updateBonusDisplay();
        this.updateNextBonusDisplay();
        
        // Initialize hand counter
        this.updateHandCounter();
        
        // Initialize button states
        this.updateHitButtonState();
        this.updateStayButtonState();

        // Initialize extra cards
        this.extraCards = [];
        this.usedExtraCards = [];
        this.setupExtraCards();

        // Set up event listeners
        this.setupEventListeners();

    }

    setupEventListeners() {
        // Remove existing event listeners first
        const playButton = document.getElementById('playButton');
        const hitButton = document.getElementById('hitButton');
        const stayButton = document.getElementById('stayButton');
        
        if (playButton) {
            playButton.replaceWith(playButton.cloneNode(true));
        }
        if (hitButton) {
            hitButton.replaceWith(hitButton.cloneNode(true));
        }
        if (stayButton) {
            stayButton.replaceWith(stayButton.cloneNode(true));
        }

        // Get fresh references after cloning
        const newPlayButton = document.getElementById('playButton');
        const newHitButton = document.getElementById('hitButton');
        const newStayButton = document.getElementById('stayButton');

        // Play button functionality
        if (newPlayButton) {
            newPlayButton.addEventListener('click', () => {
                console.log('Play button clicked');
                this.e.s.p('brightClick');
                this.gameAction = "new round";
                document.getElementById('startMenu').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'flex';
            });
        }

        // Hit button functionality
        if (newHitButton) {
            newHitButton.addEventListener('click', () => {
                console.log('Hit button clicked, gameAction:', this.gameAction, 'dealingCard:', this.dealingCard);
                if (this.gameAction === "game" && this.currentCards.length < 5) {
                    console.log('Calling dealCard()');
                    this.e.s.p('flip1');
                    this.e.s.p('click');
                    this.dealCard();
                    
                    // Check if this hit will result in 21
                    const currentValue = this.cardValue;
                    const newCard = this.generateRandomCard();
                    const newValue = currentValue + this.getCardValue(newCard);
                    
                    if (newValue === 21) {
                        // Animate fader for 21 on hit
                        setTimeout(() => {
                            this.animateFader(0.5, 0.5);
                        }, 300); // Wait for card animation to complete
                    }
                } else {
                    console.log('Game not in "game" state or max cards reached, cannot deal card');
                }
            });
        }

        // Stay button functionality
        if (newStayButton) {
            newStayButton.addEventListener('click', () => {
                console.log('Stay button clicked, gameAction:', this.gameAction);
                if (this.gameAction === "game") {
                    // Calculate base score based on card value
                    let basePoints = 0;
                    if (this.cardValue >= 17) {
                        const pointMap = { 17: 100, 18: 200, 19: 300, 20: 400, 21: 800 };
                        basePoints = pointMap[this.cardValue] || 0;
                    }
                    
                    // Track statistics
                    if (this.cardValue >= 16 && this.cardValue <= 21) {
                        this[`score${this.cardValue}`]++;
                    }
                    this.cardPoints += basePoints;
                    
                    // Apply bonus multiplier to score
                    const finalPoints = Math.floor(basePoints * this.bonusMult);
                    this.score += finalPoints;
                    this.multBonus += (finalPoints - basePoints);
                    document.getElementById('scoreDiv').textContent = this.score;
                    console.log('Score updated to:', this.score);
                    
                    // Create score callout
                    const scoreCallout = document.createElement('div');
                    scoreCallout.textContent = `+${finalPoints}`;
                    
                    // Get card value div position
                    const cardValueDiv = document.getElementById('cardValue');
                    const cardValueRect = cardValueDiv ? cardValueDiv.getBoundingClientRect() : null;
                    const startY = cardValueRect ? cardValueRect.top + cardValueRect.height / 2 : window.innerHeight / 2;
                    
                    scoreCallout.style.cssText = `
                        position: absolute;
                        left: 50%;
                        transform: translateX(-50%);
                        top: ${startY}px;
                        color: #ffd700;
                        font-size: 48px;
                        font-weight: bold;
                        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                        z-index: 1000;
                        pointer-events: none;
                        font-family: "Olympus Mount", sans-serif;
                        padding: 10px;
                    `;
                    document.body.appendChild(scoreCallout);
                    
                    // Animate score callout
                    gsap.to(scoreCallout, {
                        y: -100,
                        opacity: 0,
                        duration: 1,
                        ease: "power2.out",
                        onComplete: () => {
                            document.body.removeChild(scoreCallout);
                        }
                    });
                    
                    // Add bonus reward to bonus multiplier
                    const bonusReward = this.calculateBonusReward(this.cardValue);
                    this.bonusMult = Math.min(5, this.bonusMult + bonusReward);
                    this.updateBonusDisplay();
                    
                    // Replace used extra cards if player got 21
                    if (this.cardValue === 21) {
                        this.replaceUsedExtraCards();
                        // Animate fader for 21 on stay
                        this.animateFader(0.5, 0.8);
                        this.e.s.p('bonus1');
                    } else {
                        this.e.s.p('coin');
                    }
                    
                    this.gameAction = "end round";
                    
                    // Increment hand counter
                    this.handCount++;
                    this.updateHandCounter();
                }
            });
        }
    }

    update() {
        
        if(this.action==="set up"){
            this.action = "start";
            this.count=0;
        }else if(this.action==="start"){
            // Timer countdown (only after game starts)
            if (this.gameAction !== "waiting") {
                this.gameTime -= this.e.dt;
                if (this.gameTime <= 0) {
                    this.gameTime = 0;
                    // Time's up logic
                    this.showFinalScore();
                    this.action="end"
                }
            }
            
            // Game logic
            if(this.gameAction==="waiting"){
                // Waiting for play button to be clicked
                this.updateTimer();
                // Ensure timer is visible
                const timerDiv = document.getElementById('timerDiv');
                if (timerDiv) {
                    timerDiv.style.opacity = '1';
                    timerDiv.style.visibility = 'visible';
                }
            }else if(this.gameAction==="new round"){

                console.log('Starting new round');
                this.e.s.p('woosh1');
                
                // Hide card value initially
                const cardValueElement = document.getElementById('cardValue');
                if (cardValueElement) {
                    cardValueElement.style.opacity = '0';
                }
                
                // Deal 2 cards almost simultaneously
                console.log('Dealing first card');
                this.dealCard();
                setTimeout(() => {
                    console.log('Dealing second card');
                    this.dealCard();
                }, 100); // Much shorter delay for almost simultaneous dealing
                
                this.gameAction = "new round wait";

            }else if(this.gameAction==="new round wait"){
                
                this.updateTimer();

                this.count+=this.e.dt;
                if(this.count>.3){
                    this.count=0;
                    this.gameAction="game";
                }

            }else if(this.gameAction==="game"){

                this.updateTimer();

            }else if(this.gameAction==="bust"){
                // Disable buttons
                const hitButton = document.getElementById('hitButton');
                const stayButton = document.getElementById('stayButton');
                if (hitButton) hitButton.style.pointerEvents = 'none';
                if (stayButton) stayButton.style.pointerEvents = 'none';
                
                // Animate fader for bust
                this.animateFader(1, 1, 'red');
                this.e.s.p("wrongBuzzer");
                
                // Show bust background
                this.bustBackground = document.createElement('div');
                this.bustBackground.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 100vw;
                    height: 400px;
                    background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0) 100%);
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.2s ease-out;
                `;
                document.body.appendChild(this.bustBackground);
                
                // Show bust text
                this.bustText = document.createElement('div');
                this.bustText.textContent = 'BUST';
                this.bustText.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(2);
                    font-size: 72px;
                    font-weight: bold;
                    color: #ff4444;
                    z-index: 10000;
                    font-family: "Olympus Mount", sans-serif;
                    text-shadow: 2px 2px 12px rgba(0, 0, 0, 0.7);
                    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
                `;
                document.body.appendChild(this.bustText);
                
                // Animate background and text in
                setTimeout(() => {
                    this.bustBackground.style.opacity = '1';
                }, 50);
                
                // Animate to normal size
                setTimeout(() => {
                    this.bustText.style.transform = 'translate(-50%, -50%) scale(1)';
                }, 50);
                
                // Subtract 200 points for bust
                this.score = Math.max(0, this.score - 200);
                const scoreDiv = document.getElementById('scoreDiv');
                if (scoreDiv) {
                    scoreDiv.textContent = this.score;
                }
                
                // Track bust
                this.bustCount++;
                
                // Reset bonus multiplier to 1
                this.bonusMult = 1;
                this.updateBonusDisplay();
                
                // Clear and replace all extra cards on bust
                this.replaceAllExtraCards();
                
                this.gameAction = "bust wait";
                setTimeout(() => {
                    // Fade out background and text
                    if (this.bustBackground) {
                        this.bustBackground.style.opacity = '0';
                    }
                    if (this.bustText) {
                        this.bustText.style.opacity = '0';
                    }
                    
                    // Remove elements after fade
                    setTimeout(() => {
                        if (this.bustText && this.bustText.parentNode) {
                            document.body.removeChild(this.bustText);
                        }
                        if (this.bustBackground && this.bustBackground.parentNode) {
                            document.body.removeChild(this.bustBackground);
                        }
                        this.gameAction = "end round";
                    }, 200);
                }, 1500);
            }else if(this.gameAction==="bust wait"){
                // Wait for bust animation
                this.updateTimer();
            }else if(this.gameAction==="end round"){
                // Animate cards out with GSAP using tracked array
                if (this.cardElements.length > 0) {
                    this.cardElements.forEach((card, index) => {
                        gsap.to(card, {
                            left: '-300px',
                            rotation: 45,
                            duration: 0.2,
                            ease: "power2.in",
                            delay: 0
                            
                        });
                    });
                }
                
                // Fade out card value
                const cardValueElement = document.getElementById('cardValue');
                if (cardValueElement) {
                    cardValueElement.style.transition = 'opacity 0.5s ease-out';
                    cardValueElement.style.opacity = '0';
                }

                this.count=0;
                this.gameAction="end round wait"

            }else if(this.gameAction==="end round wait"){

                this.count+=this.e.dt;
                if(this.count>.4){
                    this.count=0;
                    this.gameAction="reset";
                }
                
            }else if(this.gameAction==="reset"){

                for(var i=0;i<this.cardElements.length;i++){
                    if (this.cardElements[i].parentNode) {
                        this.cardElements[i].remove();
                    }                
                }

                this.updateTimer();
                
                // Clear all card arrays and state
                this.cardElements = [];
                this.currentCards = [];
                this.cardValue = 0;
                this.dealingCard = false;
                this.initialDealAnimationTriggered = false;
                
                // Only subtract 200 points if player busted (not if they stayed)
                // The score is already calculated in the stay button click handler
                const scoreDiv = document.getElementById('scoreDiv');
                if (scoreDiv) {
                    scoreDiv.textContent = this.score;
                }
                
                // Re-enable buttons
                const hitButton = document.getElementById('hitButton');
                const stayButton = document.getElementById('stayButton');
                if (hitButton) hitButton.style.pointerEvents = 'auto';
                if (stayButton) stayButton.style.pointerEvents = 'auto';
                
                // Update button states
                this.updateHitButtonState();
                this.updateStayButtonState();
                
                // Only replace used extra cards if player got 21 or busted
                // (Extra cards will persist between rounds otherwise)
                
                this.gameAction = "new round";
            }
        }else if(this.action==="go"){
            this.action = "end";
        }

    }

    // Update timer display
    updateTimer() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timerDiv = document.getElementById('timerDiv');
        // console.log('updateTimer called, gameTime:', this.gameTime, 'minutes:', minutes, 'seconds:', seconds);
        if (timerDiv) {
            timerDiv.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            timerDiv.style.opacity = '1';
            timerDiv.style.visibility = 'visible';
            // console.log('Timer updated to:', timerDiv.textContent);
        } else {
            console.log('Timer div not found');
        }
    }

    // Deal a card
    dealCard() {
        // Special case for initial two-card deal - allow simultaneous dealing
        const isInitialDeal = this.currentCards.length < 2 && this.gameAction === "new round wait";
        
        // Prevent multiple cards from being dealt simultaneously (except initial deal)
        if (this.dealingCard && !isInitialDeal) {
            console.log('Already dealing a card, skipping');
            return;
        }
        
        if (!isInitialDeal) {
            this.dealingCard = true;
        }
        
        console.log('Dealing card, current cards:', this.currentCards.length);
        
        const card = this.generateRandomCard();
        this.currentCards.push(card);
        
        // Animate card in
        this.animateCardIn(card);
        
        // Update card value after animation
        setTimeout(() => {
            // Only update card value and trigger animation when we have 2 cards (initial deal) or when it's not the initial deal
            const shouldUpdateValue = (this.currentCards.length === 2 && !this.initialDealAnimationTriggered) || !isInitialDeal;
            if (shouldUpdateValue) {
                this.updateCardValue();
                if (isInitialDeal && this.currentCards.length === 2) {
                    this.initialDealAnimationTriggered = true;
                }
            }
            
            if (!isInitialDeal) {
                this.dealingCard = false;
            }
           
            // Update hit button state
            this.updateHitButtonState();
            this.updateStayButtonState();
        }, 300); // Reduced to match the faster animation
    }

    // Generate random card
    generateRandomCard() {
        const suits = ['S', 'H', 'D', 'C'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'J', 'Q', 'K', 'A'];
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const value = values[Math.floor(Math.random() * values.length)];
        return { suit, value, displayValue: value };
    }

    // Get card value
    getCardValue(card) {
        if (card.value === 'A') return 11;
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        return parseInt(card.value);
    }

    // Calculate total card value with proper ace handling
    calculateCardValue() {
        let total = 0;
        let aces = 0;
        
        // First pass: count all non-ace cards and count aces
        for (let card of this.currentCards) {
            if (card.value === 'A') {
                aces++;
            } else {
                total += this.getCardValue(card);
            }
        }
        
        // Second pass: add aces, using 11 if possible, otherwise 1
        for (let i = 0; i < aces; i++) {
            if (total + 11 <= 21) {
                total += 11;
            } else {
                total += 1;
            }
        }
        
        return total;
    }

    // Calculate bonus reward based on card value
    calculateBonusReward(cardValue) {
        if (cardValue === 21) return 1;
        if (cardValue === 20) return 0.5;
        if (cardValue === 19) return 0.4;
        if (cardValue === 18) return 0.3;
        if (cardValue === 17) return 0.2;
        if (cardValue === 16) return 0.1;
        return 0;
    }

    // Update next bonus display
    updateNextBonusDisplay() {
        const nextBonusDiv = document.getElementById('nextBonus');
        if (nextBonusDiv) {
            const reward = this.calculateBonusReward(this.cardValue);
            if (reward > 0) {
                nextBonusDiv.textContent = `BONUS MULT: +${reward}`;
            } else {
                nextBonusDiv.textContent = `BONUS MULT: +0`;
            }
        }
    }

    // Update bonus display
    updateBonusDisplay() {
        const bonusDisplay = document.getElementById('bonusDisplay');
        if (bonusDisplay) {
            bonusDisplay.textContent = `BONUS: x${this.bonusMult.toFixed(1)}`;
        }
    }

    // Update hand counter display
    updateHandCounter() {
        const levelDiv = document.getElementById('levelDiv');
        if (levelDiv) {
            levelDiv.textContent = `HAND: ${this.handCount}`;
        }
    }

    // Show final score screen
    showFinalScore() {
        // Animate fader for game end
        this.animateFader(1, 1);
        this.e.s.p('achievement1');
        
        // Hide game elements
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        // Calculate total rounds for percentage calculation
        const totalRounds = this.score21 + this.score20 + this.score19 + this.score18 + this.score17 + this.score16;
        
        // Update final score breakdown
        document.getElementById('score21').textContent = this.score21;
        document.getElementById('score20').textContent = this.score20;
        document.getElementById('score19').textContent = this.score19;
        document.getElementById('score18').textContent = this.score18;
        document.getElementById('score17').textContent = this.score17;
        document.getElementById('score16').textContent = this.score16;
        document.getElementById('cardPoints').textContent = this.cardPoints;
        document.getElementById('multBonus').textContent = this.multBonus;
        document.getElementById('bustCount').textContent = this.bustCount;
        document.getElementById('scoreDiv2').textContent = this.score;
        
        // Update progress bars
        if (totalRounds > 0) {
            document.getElementById('progress21').style.height = (this.score21 / totalRounds * 100) + '%';
            document.getElementById('progress20').style.height = (this.score20 / totalRounds * 100) + '%';
            document.getElementById('progress19').style.height = (this.score19 / totalRounds * 100) + '%';
            document.getElementById('progress18').style.height = (this.score18 / totalRounds * 100) + '%';
            document.getElementById('progress17').style.height = (this.score17 / totalRounds * 100) + '%';
            document.getElementById('progress16').style.height = (this.score16 / totalRounds * 100) + '%';
        }
        
        // Show final score screen
        const finalDiv = document.getElementById('finalDiv');
        if (finalDiv) {
            finalDiv.style.display = 'flex';
        }
    }

    // Animate card in
    animateCardIn(card) {
        const currentCardsDiv = document.getElementById('currentCards');
        if (!currentCardsDiv) {
            console.log('currentCards div not found');
            return;
        }
        
        console.log('Creating card image for:', card.value + card.suit);
        
        // Create new card
        const cardImg = document.createElement('img');
        cardImg.src = `src/images/cards/${card.value}${card.suit}.svg`;
        cardImg.alt = `${card.value} of ${card.suit}`;
        cardImg.className = 'card-image';
        
        // Set initial position (off-screen to the right)
        cardImg.style.position = 'absolute';
        cardImg.style.left = '100%';
        cardImg.style.top = '10px';
        cardImg.style.transform = 'rotate(-45deg)';
        
        // Add to container but don't track in array yet
        currentCardsDiv.appendChild(cardImg);
        console.log('Card image added to DOM');
        
        // Calculate card positions based on the expected final number of cards
        const cardWidth = 60; // Approximate card width in pixels
        const cardSpacing = 6; // Space between cards
        const containerWidth = currentCardsDiv.offsetWidth;
        
        let targetLeft;
        let startLeft;
        
        // Special handling for the first two cards (initial deal)
        if (this.cardElements.length < 2) {
            // Position as if there are exactly 2 cards total
            const twoCardWidth = (2 * cardWidth) + cardSpacing;
            startLeft = Math.max(0, (containerWidth - twoCardWidth) / 2);
            // Use the actual card being added (this.currentCards.length - 1) for the index
            const currentCardIndex = this.currentCards.length - 1;
            targetLeft = startLeft + (currentCardIndex * (cardWidth + cardSpacing));
        } else {
            // Normal positioning for 3rd card onwards
            const currentCardIndex = this.cardElements.length; // This card's index
            const totalCards = this.currentCards.length; // Total cards that will exist (including this one)
            const totalWidth = (totalCards * cardWidth) + ((totalCards - 1) * cardSpacing);
            startLeft = Math.max(0, (containerWidth - totalWidth) / 2);
            targetLeft = startLeft + (currentCardIndex * (cardWidth + cardSpacing));
        }
        
        // For the very first card, animate it in from the right
        if (this.cardElements.length === 0) {
            setTimeout(() => {
                gsap.to(cardImg, {
                    left: targetLeft,
                    rotation: 0,
                    duration: 0.2,
                    ease: "sine.out",
                    onComplete: () => {
                        this.cardElements.push(cardImg);
                        console.log('First card positioned, total elements:', this.cardElements.length);
                    }
                });
            }, 25);
        } else {
            // Animate existing cards to their new positions with GSAP
            this.cardElements.forEach((existingCard, index) => {
                const existingCardTargetLeft = startLeft + (index * (cardWidth + cardSpacing));
                existingCard.style.position = 'absolute';
                existingCard.style.top = '10px';
                
                gsap.to(existingCard, {
                    left: existingCardTargetLeft,
                    duration: 0.2,
                    ease: "sine.out"
                });
            });
            
            // Animate new card in with GSAP
            setTimeout(() => {
                gsap.to(cardImg, {
                    left: targetLeft,
                    rotation: 0,
                    duration: 0.2,
                    ease: "sine.out",
                    onComplete: () => {
                        // Add to array after animation completes
                        this.cardElements.push(cardImg);
                        console.log('Card added to array, total elements:', this.cardElements.length);
                    }
                });
            }, 25);
        }
    }

    // Update card value
    updateCardValue() {
        this.cardValue = this.calculateCardValue();
        const cardValueElement = document.getElementById('cardValue');
        if (cardValueElement) {
            cardValueElement.textContent = this.cardValue;
            cardValueElement.style.opacity = '1';
            
            // Kill any existing animations on the card value
            gsap.killTweensOf(cardValueElement);
            
            // Instantly set number to big size
            gsap.set(cardValueElement, { scale: 1.3 });
            
            // Add glow effect
            if (this.cardValue > 21) {
                // Red gradient and glow for bust (faint)
                cardValueElement.style.textShadow = '0 0 3px rgba(255, 68, 68, 0.3), 0 0 5px rgba(255, 68, 68, 0.3)';
                cardValueElement.style.color = '#ff4444';
                cardValueElement.style.background = 'linear-gradient(180deg, #ff6666, #ff4444)';
                cardValueElement.style.webkitBackgroundClip = 'text';
                cardValueElement.style.webkitTextFillColor = 'transparent';
                cardValueElement.style.backgroundClip = 'text';
            } else if (this.cardValue === 21) {
                // White with faint white glow for blackjack
                cardValueElement.style.textShadow = '0 0 3px rgba(255, 255, 255, 0.4), 0 0 5px rgba(255, 255, 255, 0.4)';
                cardValueElement.style.color = '#ffffff';
                cardValueElement.style.background = 'linear-gradient(180deg, #ffffff, #f0f0f0)';
                cardValueElement.style.webkitBackgroundClip = 'text';
                cardValueElement.style.webkitTextFillColor = 'transparent';
                cardValueElement.style.backgroundClip = 'text';
            } else {
                // Normal gold glow
                cardValueElement.style.textShadow = '0 0 3px #ffd700, 0 0 5px #ffd700';
                cardValueElement.style.color = '#ffd700';
            }
            
            // Animate back to normal size with GSAP
            gsap.to(cardValueElement, {
                scale: 1,
                duration: 0.2,
                ease: "power2.out",
                onComplete: () => {
                    if (this.cardValue === 21) {
                        // Keep white styling for blackjack
                        cardValueElement.style.textShadow = '0 0 3px rgba(255, 255, 255, 0.4), 0 0 5px rgba(255, 255, 255, 0.4)';
                        cardValueElement.style.color = '#ffffff';
                    } else if (this.cardValue > 21) {
                        // Keep red styling for bust
                        cardValueElement.style.textShadow = '0 0 3px rgba(255, 68, 68, 0.3), 0 0 5px rgba(255, 68, 68, 0.3)';
                        cardValueElement.style.color = '#ff4444';
                    } else {
                        // Reset to normal styling
                        cardValueElement.style.textShadow = '';
                        cardValueElement.style.color = '#ffd700';
                        cardValueElement.style.background = '';
                        cardValueElement.style.webkitBackgroundClip = '';
                        cardValueElement.style.webkitTextFillColor = '';
                        cardValueElement.style.backgroundClip = '';
                    }
                }
            });
        }
        
        // Update next bonus display
        this.updateNextBonusDisplay();
        
        // Update stay button state
        this.updateStayButtonState();
        
        // Check for bust
        if (this.cardValue > 21) {
            this.gameAction = "bust";
        }
    }

    // Update hit button state based on number of cards
    updateHitButtonState() {
        const hitButton = document.getElementById('hitButton');
        if (hitButton) {
            if (this.currentCards.length >= 5) {
                // Disable and grey out hit button
                hitButton.style.opacity = '0.5';
                hitButton.style.pointerEvents = 'none';
                hitButton.style.background = 'linear-gradient(135deg, #cccccc 0%, #999999 50%, #cccccc 100%)';
            } else {
                // Enable hit button
                hitButton.style.opacity = '1';
                hitButton.style.pointerEvents = 'auto';
                hitButton.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)';
            }
        }
    }

    // Update stay button state based on card value and number of cards
    updateStayButtonState() {
        const stayButton = document.getElementById('stayButton');
        if (stayButton) {
            const canStay = this.cardValue > 15 || this.currentCards.length >= 5;
            if (canStay) {
                // Enable stay button
                stayButton.style.opacity = '1';
                stayButton.style.pointerEvents = 'auto';
                stayButton.style.background = 'linear-gradient(135deg, #ff4444 0%, #ff6666 50%, #ff4444 100%)';
            } else {
                // Disable and grey out stay button
                stayButton.style.opacity = '0.5';
                stayButton.style.pointerEvents = 'none';
                stayButton.style.background = 'linear-gradient(135deg, #cccccc 0%, #999999 50%, #cccccc 100%)';
            }
        }
    }

    // Setup extra cards
    setupExtraCards() {
        const extraCardsDiv = document.getElementById('extraCards');
        if (!extraCardsDiv) return;
        
        // Clear existing cards
        extraCardsDiv.innerHTML = '';
        this.extraCards = [];
        
        // Create 3 random cards
        for (let i = 0; i < 3; i++) {
            const card = this.generateRandomCard();
            this.extraCards.push(card);
            
            const cardImg = document.createElement('img');
            cardImg.src = `src/images/cards/${card.value}${card.suit}.svg`;
            cardImg.alt = `${card.value} of ${card.suit}`;
            cardImg.className = 'card-image';
            cardImg.style.cursor = 'pointer';
            cardImg.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
            cardImg.style.position = 'absolute';
            // Center the 3 cards horizontally: 3 cards * 60px + 2 gaps * 6px = 192px total width
            // Assuming container is ~400px wide, center offset = (400 - 192) / 2 = 104px
            // Add 2px border offset = 106px starting position
            cardImg.style.left = (90 + i * 66) + 'px'; // 60px card width + 6px spacing
            cardImg.style.top = '10px'; // Center vertically (100px div height - 80px card height = 20px, so 10px from top)
            
            // Add click event
            cardImg.addEventListener('click', () => {
                this.useExtraCard(card, cardImg);
            });
            
            extraCardsDiv.appendChild(cardImg);
        }
    }

    // Replace used extra cards
    replaceUsedExtraCards() {
        const extraCardsDiv = document.getElementById('extraCards');
        if (!extraCardsDiv) return;
        
        // Get all card images
        const cardImages = extraCardsDiv.querySelectorAll('.card-image');
        
        // Update each hidden card with a new card
        cardImages.forEach((cardImg, index) => {
            if (cardImg.style.opacity === '0') {
                // Generate new card
                const newCard = this.generateRandomCard();
                this.extraCards.push(newCard);
                
                // Update the existing image
                cardImg.src = `src/images/cards/${newCard.value}${newCard.suit}.svg`;
                cardImg.alt = `${newCard.value} of ${newCard.suit}`;
                cardImg.style.opacity = '0'; // Start invisible
                cardImg.style.pointerEvents = 'auto';
                cardImg.style.transform = 'scale(0)'; // Start scaled down
                cardImg.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                
                // Remove old click event and add new one
                cardImg.replaceWith(cardImg.cloneNode(true));
                const newCardImg = extraCardsDiv.querySelectorAll('.card-image')[index];
                newCardImg.style.position = 'absolute';
                // Center the 3 cards horizontally: 3 cards * 60px + 2 gaps * 6px = 192px total width
                // Assuming container is ~400px wide, center offset = (400 - 192) / 2 = 104px
                // Add 2px border offset = 106px starting position
                newCardImg.style.left = (90 + index * 66) + 'px'; // 60px card width + 6px spacing
                newCardImg.style.top = '10px'; // Center vertically (100px div height - 80px card height = 20px, so 10px from top)
                newCardImg.onclick = () => {
                    this.useExtraCard(newCard, newCardImg);
                };
                
                // Animate in with delay based on index
                setTimeout(() => {
                    newCardImg.style.transform = 'scale(1)';
                    newCardImg.style.opacity = '1';
                }, index * 100); // Stagger the animations
            }
        });
    }

    // Replace all extra cards (used on bust)
    replaceAllExtraCards() {
        const extraCardsDiv = document.getElementById('extraCards');
        if (!extraCardsDiv) return;
        
        // Clear all existing cards
        extraCardsDiv.innerHTML = '';
        this.extraCards = [];
        
        // Create 3 new random cards
        for (let i = 0; i < 3; i++) {
            const card = this.generateRandomCard();
            this.extraCards.push(card);
            
            const cardImg = document.createElement('img');
            cardImg.src = `src/images/cards/${card.value}${card.suit}.svg`;
            cardImg.alt = `${card.value} of ${card.suit}`;
            cardImg.className = 'card-image';
            cardImg.style.position = 'absolute';
            cardImg.style.left = (90 + i * 66) + 'px'; // 60px card width + 6px spacing
            cardImg.style.top = '10px'; // Center vertically (100px div height - 80px card height = 20px, so 10px from top)
            cardImg.style.cursor = 'pointer';
            cardImg.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            cardImg.style.transform = 'scale(0)'; // Start scaled down
            cardImg.style.opacity = '0'; // Start invisible
            
            // Add click event
            cardImg.onclick = () => {
                this.useExtraCard(card, cardImg);
            };
            
            extraCardsDiv.appendChild(cardImg);
            
            // Animate in with delay based on index
            setTimeout(() => {
                cardImg.style.transform = 'scale(1)';
                cardImg.style.opacity = '1';
            }, i * 100); // Stagger the animations
        }
    }

    // Use an extra card
    useExtraCard(card, cardImg) {
        // Disable pointer events
        cardImg.style.pointerEvents = 'none';
        
        // Hide the card with opacity
        cardImg.style.opacity = '0';
        
        // Play sound
        this.e.s.p('flip1');
        this.e.s.p('click');
        
        // Deal the specific card
        this.dealSpecificCard(card);
        
        // Remove the card from extraCards array
        const cardIndex = this.extraCards.indexOf(card);
        if (cardIndex > -1) {
            this.extraCards.splice(cardIndex, 1);
        }
    }

    // Deal a specific card
    dealSpecificCard(card) {
        // Prevent multiple cards from being dealt simultaneously
        if (this.dealingCard) {
            console.log('Already dealing a card, skipping');
            return;
        }
        this.dealingCard = true;
        
        console.log('Dealing specific card:', card.value + card.suit);
        
        this.currentCards.push(card);
        
        // Animate card in
        this.animateCardIn(card);
        
        // Update card value after animation
        setTimeout(() => {
            this.updateCardValue();
            this.dealingCard = false;
            this.updateHitButtonState();
            this.updateStayButtonState();
            console.log('Specific card dealt, total cards:', this.currentCards.length);
        }, 300);
    }

    // Fader animation function
    animateFader(opacity, duration, color = 'white') {
        const fader = document.getElementById('fader');
        if (!fader) return;
        
        // Ensure the fader has a proper background color
        if (color === 'black') {
            fader.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        } else if (color === 'red') {
            fader.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
        } else {
            fader.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        }
        
        fader.style.opacity = opacity;

        gsap.to(fader, {
            opacity: 0,
            duration: duration,
            ease: "linear", // Linear tween
            
        });
        
        setTimeout(() => {
            // fader.style.opacity = '0';
        }, 100);
    }



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

        console.log("startme")
  
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