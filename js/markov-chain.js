/**
 * Markov Chain implementation for the Syberia Music AI Remix project
 * Generates new musical sequences based on statistical patterns in the input
 */

class MarkovChain {
    /**
     * Create a new Markov chain model
     * @param {number} order - Order of the Markov chain (1 for first-order, 2 for second-order, etc.)
     */
    constructor(order = 1) {
        this.order = order;
        this.transitionTable = new Map();
        this.startingStates = [];
    }

    /**
     * Train the Markov model on a sequence of data
     * @param {Array} sequence - Array of values (e.g., MIDI note numbers)
     * @returns {MarkovChain} - Returns this for chaining
     */
    train(sequence) {
        if (sequence.length <= this.order) {
            console.warn(`Sequence too short for Markov order ${this.order}`);
            return this;
        }

        // Store potential starting states
        this.startingStates.push(sequence.slice(0, this.order));

        // Build transition table
        for (let i = 0; i <= sequence.length - this.order - 1; i++) {
            // Create a state key from current window of notes
            const state = JSON.stringify(sequence.slice(i, i + this.order));
            const nextValue = sequence[i + this.order];

            // Add to transition table
            if (!this.transitionTable.has(state)) {
                this.transitionTable.set(state, []);
            }
            this.transitionTable.get(state).push(nextValue);
        }
        
        return this;
    }

    /**
     * Generate a new sequence based on the trained model
     * @param {number} length - Desired length of the generated sequence
     * @param {Array} startState - Optional starting state (must match order length)
     * @returns {Array} - Generated sequence
     */
    generate(length, startState = null) {
        if (this.transitionTable.size === 0) {
            console.error("Markov chain not trained yet");
            return [];
        }

        // Initialize the sequence
        let sequence;
        
        if (startState && startState.length === this.order) {
            // Use provided start state
            sequence = [...startState];
        } else if (this.startingStates.length > 0) {
            // Randomly select a starting state from training data
            const randomIndex = Math.floor(Math.random() * this.startingStates.length);
            sequence = [...this.startingStates[randomIndex]];
        } else {
            console.error("No valid starting state available");
            return [];
        }

        // Generate the sequence
        while (sequence.length < length) {
            // Get current state
            const state = JSON.stringify(sequence.slice(sequence.length - this.order));
            
            // Find possible next values
            if (this.transitionTable.has(state)) {
                const possibleNextValues = this.transitionTable.get(state);
                const nextValue = possibleNextValues[Math.floor(Math.random() * possibleNextValues.length)];
                sequence.push(nextValue);
            } else {
                // No transition found for current state, pick a random starting state
                if (this.startingStates.length > 0) {
                    const randomState = this.startingStates[Math.floor(Math.random() * this.startingStates.length)];
                    sequence.push(randomState[0]);
                } else {
                    // If all else fails, break the loop
                    console.warn("No transition found and no starting states available");
                    break;
                }
            }
        }

        return sequence;
    }

    /**
     * Get probability matrix for first-order Markov chains
     * @returns {Object} - Matrix of transition probabilities
     */
    getProbabilityMatrix() {
        if (this.order !== 1) {
            console.warn("Probability matrix only available for first-order Markov chains");
            return null;
        }

        // Collect all unique states
        const uniqueStates = new Set();
        
        // Add states from transition table
        for (const state of this.transitionTable.keys()) {
            const parsedState = JSON.parse(state)[0];
            uniqueStates.add(parsedState);
            
            // Add next states
            for (const nextState of this.transitionTable.get(state)) {
                uniqueStates.add(nextState);
            }
        }

        // Convert to sorted array
        const states = Array.from(uniqueStates).sort((a, b) => a - b);
        
        // Initialize matrix with zeros
        const matrix = {};
        for (const fromState of states) {
            matrix[fromState] = {};
            
            for (const toState of states) {
                matrix[fromState][toState] = 0;
            }
        }

        // Fill in transition counts
        for (const [stateStr, nextValues] of this.transitionTable.entries()) {
            const fromState = JSON.parse(stateStr)[0];
            
            for (const toState of nextValues) {
                matrix[fromState][toState]++;
            }
        }

        // Normalize to probabilities
        for (const fromState of states) {
            const total = Object.values(matrix[fromState]).reduce((sum, count) => sum + count, 0);
            
            if (total > 0) {
                for (const toState of states) {
                    matrix[fromState][toState] /= total;
                }
            }
        }

        return {
            states: states,
            matrix: matrix
        };
    }

    /**
     * Update transition probabilities with user-defined values
     * @param {Object} newProbabilities - New probability values
     */
    updateProbabilities(newProbabilities) {
        if (this.order !== 1) {
            console.warn("Updating probabilities only available for first-order Markov chains");
            return;
        }

        // Clear current transition table
        this.transitionTable.clear();
        
        // Rebuild from the new probabilities
        for (const [fromState, transitions] of Object.entries(newProbabilities)) {
            const stateKey = JSON.stringify([parseInt(fromState)]);
            
            for (const [toState, probability] of Object.entries(transitions)) {
                // Skip zero probabilities
                if (probability <= 0) continue;
                
                // Add transitions according to probability (weighted sampling)
                const count = Math.round(probability * 100); // Scale to integer
                
                if (!this.transitionTable.has(stateKey)) {
                    this.transitionTable.set(stateKey, []);
                }
                
                // Add multiple entries to represent probability
                for (let i = 0; i < count; i++) {
                    this.transitionTable.get(stateKey).push(parseInt(toState));
                }
            }
        }
    }

    /**
     * Add musical structure constraints to the generation
     * @param {Object} constraints - Musical constraints object
     * @returns {MarkovChain} - Returns this for chaining
     */
    addConstraints(constraints) {
        // This is a placeholder for more sophisticated constraints
        // In a complete implementation, this could include:
        // - Ensuring certain notes appear at specific positions
        // - Controlling the overall contour (ascending/descending patterns)
        // - Enforcing harmonic constraints (chord tones)
        // - Avoiding excessive repetition
        
        console.log("Constraint functionality not yet implemented");
        return this;
    }
    
    /**
     * Generate with guidance from musical themes
     * @param {number} length - Desired sequence length
     * @param {Array} themes - Array of thematic fragments to include
     * @returns {Array} - Generated sequence
     */
    generateWithThemes(length, themes) {
        if (!themes || themes.length === 0) {
            // Fall back to standard generation if no themes
            return this.generate(length);
        }
        
        // Generate a base sequence
        const baseSequence = this.generate(length);
        
        // Select positions to insert themes
        const themePositions = [];
        const segmentSize = Math.floor(length / themes.length);
        
        // Distribute themes throughout the sequence
        for (let i = 0; i < themes.length; i++) {
            const position = i * segmentSize;
            themePositions.push(position);
        }
        
        // Insert each theme at its position
        for (let i = 0; i < themes.length; i++) {
            const theme = themes[i];
            const position = themePositions[i];
            
            // Skip if position is beyond sequence length
            if (position >= baseSequence.length) continue;
            
            // Skip if theme has no notes
            if (!theme.notes || theme.notes.length === 0) continue;
            
            // Calculate how many notes to replace
            const notesToReplace = Math.min(theme.notes.length, baseSequence.length - position);
            
            // Replace notes with theme
            for (let j = 0; j < notesToReplace; j++) {
                baseSequence[position + j] = theme.notes[j];
            }
        }
        
        return baseSequence;
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkovChain;
}