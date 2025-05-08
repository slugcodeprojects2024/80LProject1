/**
 * L-System implementation for the Syberia Music AI Remix project
 * Creates fractal-like musical structures
 */

class LSystem {
    /**
     * Create a new L-System
     * @param {string} axiom - Starting symbol
     * @param {Object} rules - Production rules mapping symbols to replacements
     */
    constructor(axiom, rules) {
        this.axiom = axiom;
        this.rules = rules;
        this.result = axiom;
    }

    /**
     * Parse rules from a string format (e.g. "A→AB,B→A")
     * @param {string} rulesStr - String containing rules
     * @returns {Object} - Rules object
     */
    static parseRules(rulesStr) {
        const rules = {};
        
        // Support both arrow formats
        const cleanedStr = rulesStr.replace(/→/g, "->").trim();
        
        // Split by comma or semicolon
        const rulePairs = cleanedStr.split(/[,;]/);
        
        for (const pair of rulePairs) {
            const parts = pair.split(/\s*->\s*/);
            if (parts.length === 2) {
                const [symbol, replacement] = parts;
                if (symbol.length === 1) {
                    rules[symbol.trim()] = replacement.trim();
                }
            }
        }
        
        return rules;
    }

    /**
     * Generate L-System string by applying rules for specified iterations
     * @param {number} iterations - Number of iterations to apply rules
     * @returns {string} - Generated L-System string
     */
    generate(iterations) {
        let current = this.axiom;
        
        for (let i = 0; i < iterations; i++) {
            let next = '';
            
            for (const symbol of current) {
                if (this.rules[symbol]) {
                    next += this.rules[symbol];
                } else {
                    next += symbol; // Keep symbol if no rule exists
                }
            }
            
            current = next;
        }
        
        this.result = current;
        return this.result;
    }

    /**
     * Apply musical transformations to a sequence based on L-system
     * @param {Array} sequence - Original sequence to transform
     * @param {Object} transformations - Mapping from symbols to transformations
     * @returns {Array} - Transformed sequence
     */
    applyToMusic(sequence, transformations) {
        if (!this.result || this.result.length === 0) {
            console.warn("L-System not generated yet");
            return sequence;
        }

        // Default transformations if none provided
        const defaultTransform = {
            // Transpose up one semitone
            'A': (note) => Math.min(note + 1, 127),
            // Transpose down one semitone
            'B': (note) => Math.max(note - 1, 0),
            // Inverse around middle C (60)
            'C': (note) => 120 - note,
            // Double duration (handled separately)
            'D': (note) => note,
            // Repeat note (handled separately)
            'E': (note) => note,
            // No change
            'F': (note) => note
        };

        const transforms = transformations || defaultTransform;
        
        // Determine segment size based on L-system length
        const segmentSize = Math.ceil(sequence.length / this.result.length);
        let transformed = [];
        
        // Apply transformations by segments
        for (let i = 0; i < this.result.length; i++) {
            const symbol = this.result[i];
            const startIdx = i * segmentSize;
            const endIdx = Math.min((i + 1) * segmentSize, sequence.length);
            
            if (startIdx >= sequence.length) break;
            
            const segment = sequence.slice(startIdx, endIdx);
            
            // Apply transformation based on symbol
            if (transforms[symbol]) {
                // Apply note transformation
                const transformedSegment = segment.map(transforms[symbol]);
                transformed = transformed.concat(transformedSegment);
            } else {
                // No transformation for this symbol
                transformed = transformed.concat(segment);
            }
        }
        
        return transformed;
    }
    
    /**
     * Get transformation function for a symbol
     * @param {string} symbol - L-system symbol
     * @returns {Function} - Transformation function
     */
    getTransformation(symbol) {
        // Define musical transformations for each symbol
        const transformations = {
            'A': (note) => Math.min(note + 2, 127),  // Major second up
            'B': (note) => Math.max(note - 2, 0),    // Major second down
            'C': (note) => Math.min(note + 7, 127),  // Perfect fifth up
            'D': (note) => Math.max(note - 7, 0),    // Perfect fifth down
            'E': (note) => Math.min(note + 12, 127), // Octave up
            'F': (note) => Math.max(note - 12, 0),   // Octave down
            'G': (note) => 127 - note,               // Inversion (mirror)
            'H': (note) => note,                     // No change
            'I': (note) => 60 + ((note - 60) * -1),  // Inversion around middle C
            'J': (note) => note % 12 + 60,           // Normalize to middle octave
            'K': (note) => {                         // Chord tones (CEG)
                const mod = note % 12;
                if (mod === 0) return note;          // C
                if (mod === 4) return note;          // E
                if (mod === 7) return note;          // G
                return note + 1;                     // Move toward chord tones
            },
            'L': (note) => {                         // Chord tones (DFA)
                const mod = note % 12;
                if (mod === 2) return note;          // D
                if (mod === 5) return note;          // F
                if (mod === 9) return note;          // A
                return note - 1;                     // Move toward chord tones
            },
            'M': (note) => note + (Math.floor(Math.random() * 3) - 1) // Small random change
        };
        
        // Return the transformation function or identity function if not found
        return transformations[symbol] || ((note) => note);
    }
    
    /**
     * Create common predefined L-Systems for music
     * @param {string} type - Type of L-System to create
     * @returns {LSystem} - New L-System instance
     */
    static createPredefined(type) {
        const systems = {
            // Fibonacci sequence analog (simpler version)
            fibonacci: {
                axiom: 'A',
                rules: { 'A': 'AB', 'B': 'A' }
            },
            
            // Cantor set (useful for rhythmic patterns)
            cantor: {
                axiom: 'A',
                rules: { 'A': 'ABA', 'B': 'BBB' }
            },
            
            // Dragon curve (creates interesting melodic twists)
            dragon: {
                axiom: 'FX',
                rules: { 'X': 'X+YF+', 'Y': '-FX-Y' }
            },
            
            // Koch curve (creates hierarchical structures)
            koch: {
                axiom: 'F',
                rules: { 'F': 'F+F-F-F+F' }
            },
            
            // Sierpinski triangle (useful for harmony)
            sierpinski: {
                axiom: 'A',
                rules: { 'A': 'B-A-B', 'B': 'A+B+A' }
            },
            
            // Fractal tree (for branching structures)
            tree: {
                axiom: 'X',
                rules: { 'X': 'F[+X][-X]FX', 'F': 'FF' }
            },
            
            // Simple binary growth (for creating tension)
            binary: {
                axiom: 'A',
                rules: { 'A': 'AB', 'B': 'BA' }
            },
            
            // Custom musical structure inspired by Syberia themes
            syberia: {
                axiom: 'S',
                rules: { 'S': 'SMTS', 'M': 'TMT', 'T': 'SM' }
            }
        };
        
        if (!systems[type]) {
            console.warn(`L-System type '${type}' not found, using fibonacci instead`);
            type = 'fibonacci';
        }
        
        return new LSystem(systems[type].axiom, systems[type].rules);
    }
    
    /**
     * Apply musically meaningful transformations for the Syberia theme
     * @param {Array} sequence - Original pitch sequence
     * @returns {Array} - Transformed sequence
     */
    applySyberiaTransformations(sequence) {
        // Define specific transformations inspired by the Syberia score
        const syberiaTransforms = {
            // Main Theme motif treatment
            'S': (note) => {
                // Emphasize the key notes in Syberia's theme
                const mod = note % 12;
                if (mod === 0 || mod === 5 || mod === 7) { // C, F, G in C major
                    return note; // Keep key notes
                }
                return note + (Math.random() > 0.5 ? 1 : -1); // Slightly alter other notes
            },
            
            // Melody treatment
            'M': (note) => {
                // Move toward the melody register (higher)
                if (note < 60) return note + 12;
                if (note > 84) return note - 12;
                return note;
            },
            
            // Tension building
            'T': (note) => {
                // Add chromatic tension
                return note + (note % 2 === 0 ? 1 : -1);
            }
        };
        
        return this.applyToMusic(sequence, syberiaTransforms);
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LSystem;
}