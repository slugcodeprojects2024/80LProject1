/**
 * Cellular Automata implementation for the Syberia Music AI Remix project
 * Creates evolving patterns for rhythm and melody transformation
 */

class CellularAutomata {
    /**
     * Create a new Cellular Automata
     * @param {number} rule - Rule number (0-255 for elementary CA)
     * @param {number} size - Width of the CA
     * @param {Array} initialState - Optional initial state array
     */
    constructor(rule, size = 16, initialState = null) {
        this.rule = rule;
        this.size = size;
        this.ruleTable = this.generateRuleTable(rule);
        
        // Initialize state
        if (initialState && initialState.length === size) {
            this.currentState = [...initialState];
        } else {
            this.currentState = Array(size).fill(0);
            // Start with a single cell in the middle
            this.currentState[Math.floor(size / 2)] = 1;
        }
        
        this.history = [this.currentState.slice()];
    }
    
    /**
     * Convert rule number to rule table for elementary CA
     * @param {number} rule - Rule number (0-255)
     * @returns {Object} - Mapping from pattern to next state
     */
    generateRuleTable(rule) {
        const table = {};
        
        for (let i = 0; i < 8; i++) {
            // Convert i to binary pattern of 3 bits
            const pattern = i.toString(2).padStart(3, '0');
            // Check if the corresponding bit in rule is set
            table[pattern] = (rule & (1 << i)) ? 1 : 0;
        }
        
        return table;
    }
    
    /**
     * Get next state for a cell based on neighborhood
     * @param {number} left - Left neighbor state
     * @param {number} center - Current cell state
     * @param {number} right - Right neighbor state
     * @returns {number} - Next state for the center cell
     */
    getNextCellState(left, center, right) {
        const pattern = `${left}${center}${right}`;
        return this.ruleTable[pattern];
    }
    
    /**
     * Evolve the CA for one step
     * @returns {Array} - New current state
     */
    evolve() {
        const nextState = Array(this.size).fill(0);
        
        for (let i = 0; i < this.size; i++) {
            // Get neighboring states with wrap-around
            const left = this.currentState[(i - 1 + this.size) % this.size];
            const center = this.currentState[i];
            const right = this.currentState[(i + 1) % this.size];
            
            nextState[i] = this.getNextCellState(left, center, right);
        }
        
        this.currentState = nextState;
        this.history.push(this.currentState.slice());
        
        return this.currentState;
    }
    
    /**
     * Evolve the CA for multiple steps
     * @param {number} steps - Number of steps to evolve
     * @returns {Array} - Array of states for each step
     */
    evolveMultiple(steps) {
        const results = [];
        
        for (let i = 0; i < steps; i++) {
            results.push(this.evolve());
        }
        
        return results;
    }
    
    /**
     * Get the entire history of states
     * @returns {Array} - 2D array of all states
     */
    getHistory() {
        return this.history;
    }
    
    /**
     * Convert CA patterns to rhythmic values
     * @param {number} row - Row index in history (default: last row)
     * @returns {Array} - Array of rhythmic values (1 for onset, 0 for rest)
     */
    toRhythm(row = -1) {
        // Use the specified row or the last row if -1
        const rowIndex = row === -1 ? this.history.length - 1 : row;
        
        if (rowIndex < 0 || rowIndex >= this.history.length) {
            console.error("Invalid row index");
            return [];
        }
        
        return this.history[rowIndex];
    }
    
    /**
     * Convert CA patterns to note durations
     * @param {number} row - Row index in history
     * @param {number} minDuration - Minimum duration value
     * @param {number} maxDuration - Maximum duration value
     * @returns {Array} - Array of duration values
     */
    toDurations(row = -1, minDuration = 0.25, maxDuration = 2.0) {
        const rhythm = this.toRhythm(row);
        const durations = [];
        
        let currentDuration = 0;
        for (let i = 0; i < rhythm.length; i++) {
            if (rhythm[i] === 1) {
                // We found a note onset
                if (currentDuration > 0) {
                    // Push the accumulated rest duration
                    durations.push(-currentDuration); // Negative for rest
                    currentDuration = 0;
                }
                
                // Look ahead to calculate note duration
                let noteDuration = 1; // Base duration unit
                while (i + noteDuration < rhythm.length && rhythm[i + noteDuration] === 0) {
                    noteDuration++;
                }
                
                // Map the note duration to the desired range
                const scaledDuration = this.mapValue(noteDuration, 1, Math.floor(rhythm.length / 2), 
                                                    minDuration, maxDuration);
                durations.push(scaledDuration);
                
                i += noteDuration - 1; // Skip ahead (we'll increment again in the loop)
            } else {
                currentDuration += minDuration;
            }
        }
        
        // Add any final rest
        if (currentDuration > 0) {
            durations.push(-currentDuration);
        }
        
        return durations;
    }
    
    /**
     * Map a value from one range to another
     * @param {number} value - Value to map
     * @param {number} inMin - Input minimum
     * @param {number} inMax - Input maximum
     * @param {number} outMin - Output minimum
     * @param {number} outMax - Output maximum
     * @returns {number} - Mapped value
     */
    mapValue(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
    }
    
    /**
     * Apply CA-generated rhythm to a sequence of notes
     * @param {Array} notes - Original notes
     * @param {Array} durations - Original durations
     * @param {number} row - Row to use from CA
     * @returns {Object} - Modified notes and durations
     */
    applyToSequence(notes, durations, row = -1) {
        const caRhythm = this.toRhythm(row);
        
        // If CA is smaller than the sequence, repeat the pattern
        const fullRhythm = [];
        while (fullRhythm.length < notes.length) {
            fullRhythm.push(...caRhythm);
        }
        
        // Trim to match notes length
        const rhythm = fullRhythm.slice(0, notes.length);
        
        const newNotes = [];
        const newDurations = [];
        
        // Apply rhythm - keep notes where CA has 1, skip where CA has 0
        for (let i = 0; i < notes.length; i++) {
            if (rhythm[i] === 1) {
                newNotes.push(notes[i]);
                newDurations.push(durations[i]);
            }
        }
        
        return {
            notes: newNotes,
            durations: newDurations
        };
    }
    
    /**
     * Apply CA patterns as pitch transformations
     * @param {Array} notes - Original notes
     * @param {number} row - Row to use from CA
     * @param {number} range - Maximum transposition range
     * @returns {Array} - Transformed notes
     */
    applyToPitches(notes, row = -1, range = 4) {
        const caPattern = this.toRhythm(row);
        
        // If CA is smaller than the sequence, repeat the pattern
        const fullPattern = [];
        while (fullPattern.length < notes.length) {
            fullPattern.push(...caPattern);
        }
        
        // Trim to match notes length
        const pattern = fullPattern.slice(0, notes.length);
        
        // Apply pattern to transpose notes
        return notes.map((note, i) => {
            // Use pattern to determine transposition
            // For example, clusters of 1s could transpose up, clusters of 0s transpose down
            
            // Count 1s in the neighborhood
            let count = 0;
            const neighborhood = 3; // Look at 3 cells on each side
            
            for (let j = -neighborhood; j <= neighborhood; j++) {
                const index = (i + j + pattern.length) % pattern.length; // Wrap around
                count += pattern[index];
            }
            
            // Map count to transposition
            // Range is from -range to +range
            const transposition = this.mapValue(count, 0, neighborhood * 2 + 1, -range, range);
            
            // Apply transposition and clamp to MIDI range
            return Math.max(0, Math.min(127, Math.round(note + transposition)));
        });
    }
    
    /**
     * Generate new notes using CA evolution
     * @param {number} length - Number of notes to generate
     * @param {number} minPitch - Minimum pitch
     * @param {number} maxPitch - Maximum pitch
     * @returns {Array} - Generated pitches
     */
    generatePitches(length, minPitch = 48, maxPitch = 84) {
        // Evolve CA to generate enough states
        while (this.history.length < length) {
            this.evolve();
        }
        
        // Use evolved states to generate pitches
        return Array.from({ length }, (_, i) => {
            // Use position in the state and the state value to determine pitch
            const state = this.history[i % this.history.length];
            
            // Count active cells in the state
            const activeCount = state.reduce((sum, cell) => sum + cell, 0);
            
            // Map active count to a position in the pitch range
            const normalizedPosition = activeCount / this.size;
            const pitch = Math.floor(minPitch + normalizedPosition * (maxPitch - minPitch));
            
            return pitch;
        });
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CellularAutomata;
}