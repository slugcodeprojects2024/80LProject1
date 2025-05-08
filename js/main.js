/**
 * Piano Roll Visualizer for the Syberia Music AI Remix project
 * Creates and manages piano roll visualizations
 */

class PianoRollVisualizer {
    /**
     * Create a new piano roll visualizer
     * @param {string} containerId - ID of the container element
     * @param {Object} options - Optional configuration
     */
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container element with ID ${containerId} not found`);
            return;
        }
        
        // Default options
        this.options = {
            height: 400,
            minPitch: 36, // C2
            maxPitch: 84, // C6
            pixelsPerSecond: 100,
            noteColorClass: 'original-note',
            showLabels: true,
            ...options
        };
        
        // Initialize the piano roll
        this.init();
    }
    
    /**
     * Initialize the piano roll display
     */
    init() {
        // Clear any existing content
        this.container.innerHTML = '';
        
        // Create the note container
        this.noteContainer = document.createElement('div');
        this.noteContainer.className = 'note-container';
        this.container.appendChild(this.noteContainer);
        
        // Create piano keys
        this.createPianoKeys();
    }
    
    /**
     * Create piano keys background
     */
    createPianoKeys() {
        const pitchRange = this.options.maxPitch - this.options.minPitch + 1;
        const keyHeight = this.options.height / pitchRange;
        
        for (let pitch = this.options.minPitch; pitch <= this.options.maxPitch; pitch++) {
            const keyElement = document.createElement('div');
            keyElement.className = 'piano-key';
            
            // Add black key styling for sharps/flats
            const note = pitch % 12;
            if ([1, 3, 6, 8, 10].includes(note)) {
                keyElement.classList.add('black-key');
            }
            
            // Position the key
            const bottom = (pitch - this.options.minPitch) * keyHeight;
            keyElement.style.bottom = `${bottom}px`;
            keyElement.style.height = `${keyHeight}px`;
            
            // Add label if enabled
            if (this.options.showLabels && note === 0) { // Only label C notes
                const label = document.createElement('span');
                label.className = 'key-label';
                label.textContent = this.getMidiNoteName(pitch);
                keyElement.appendChild(label);
            }
            
            this.noteContainer.appendChild(keyElement);
        }
    }
    
    /**
     * Render notes on the piano roll
     * @param {Array} notes - Array of note objects with pitch, startTime, endTime
     * @param {number} duration - Total duration of the sequence (seconds)
     * @param {string} colorClass - Optional CSS class for note color
     */
    renderNotes(notes, duration, colorClass = null) {
        const pitchRange = this.options.maxPitch - this.options.minPitch + 1;
        const keyHeight = this.options.height / pitchRange;
        const noteClass = colorClass || this.options.noteColorClass;
        
        // Set container width based on duration
        const width = duration * this.options.pixelsPerSecond;
        this.noteContainer.style.width = `${width}px`;
        
        // Create elements for each note
        notes.forEach(note => {
            if (note.pitch < this.options.minPitch || note.pitch > this.options.maxPitch) {
                return; // Skip notes outside the visible range
            }
            
            const noteElement = document.createElement('div');
            noteElement.className = `note ${noteClass}`;
            
            // Position and size the note
            const bottom = (note.pitch - this.options.minPitch) * keyHeight;
            const left = note.startTime * this.options.pixelsPerSecond;
            const width = (note.endTime - note.startTime) * this.options.pixelsPerSecond;
            
            noteElement.style.bottom = `${bottom}px`;
            noteElement.style.left = `${left}px`;
            noteElement.style.width = `${width}px`;
            noteElement.style.height = `${keyHeight - 2}px`; // Slight gap between notes
            
            // Set opacity based on velocity
            if (note.velocity) {
                const opacity = Math.max(0.4, note.velocity / 127);
                noteElement.style.opacity = opacity;
            }
            
            this.noteContainer.appendChild(noteElement);
        });
    }
    
    /**
     * Render multiple tracks with different colors
     * @param {Object} tracks - Object with instrument tracks
     * @param {number} duration - Total duration of the sequence (seconds)
     */
    renderMultipleTracks(tracks, duration) {
        // Clear existing notes
        this.clearNotes();
        
        // Map of instrument types to CSS classes
        const trackColors = {
            strings: 'strings-note',
            brass: 'brass-note',
            woodwinds: 'woodwind-note',
            percussion: 'percussion-note'
        };
        
        // Render each track with its color
        for (const [instrument, notes] of Object.entries(tracks)) {
            if (!notes || notes.length === 0) continue;
            
            const colorClass = trackColors[instrument] || 'original-note';
            this.renderNotes(notes, duration, colorClass);
        }
    }
    
    /**
     * Render a comparison of original and generated notes
     * @param {Array} originalNotes - Array of original note objects
     * @param {Array} generatedNotes - Array of generated note objects
     * @param {number} duration - Total duration of the sequence (seconds)
     */
    renderComparison(originalNotes, generatedNotes, duration) {
        // Clear previous notes
        this.clearNotes();
        
        // Render both sets of notes with different colors
        this.renderNotes(originalNotes, duration, 'original-note');
        this.renderNotes(generatedNotes, duration, 'remixed-note');
    }
    
    /**
     * Toggle visibility of specific instrument tracks
     * @param {string} instrument - Instrument type to toggle
     * @param {boolean} visible - Whether to show or hide
     */
    toggleInstrument(instrument, visible) {
        const notes = this.container.querySelectorAll(`.${instrument}-note`);
        notes.forEach(note => {
            note.style.display = visible ? 'block' : 'none';
        });
    }
    
    /**
     * Clear all notes from the display
     */
    clearNotes() {
        // Remove all notes but keep piano keys
        const notes = this.noteContainer.querySelectorAll('.note');
        notes.forEach(note => note.remove());
    }
    
    /**
     * Convert a MIDI pitch number to note name
     * @param {number} pitch - MIDI pitch number
     * @returns {string} - Note name (e.g., "C4")
     */
    getMidiNoteName(pitch) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(pitch / 12) - 1;
        const note = noteNames[pitch % 12];
        return `${note}${octave}`;
    }
    
    /**
     * Update piano roll options
     * @param {Object} newOptions - New options to apply
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.init(); // Reinitialize with new options
    }
    
    /**
     * Fit the piano roll to show all notes
     * @param {Array} notes - Array of note objects
     * @param {number} padding - Optional padding (percent)
     * @returns {number} - Duration that fits all notes
     */
    fitToNotes(notes, padding = 10) {
        if (!notes || notes.length === 0) return 0;
        
        // Find the pitch range
        const pitches = notes.map(note => note.pitch);
        const minPitch = Math.max(0, Math.min(...pitches) - 2); // Add some padding
        const maxPitch = Math.min(127, Math.max(...pitches) + 2);
        
        // Find the time range
        const endTimes = notes.map(note => note.endTime);
        const duration = Math.max(...endTimes) * (1 + padding / 100);
        
        // Update options and re-render
        this.updateOptions({
            minPitch,
            maxPitch
        });
        
        return duration;
    }
    
    /**
     * Render beats as vertical grid lines
     * @param {Array} beats - Array of beat objects with time property
     * @param {number} duration - Total duration of the sequence
     */
    renderBeats(beats, duration) {
        if (!beats || beats.length === 0) return;
        
        // Set container width
        const width = duration * this.options.pixelsPerSecond;
        
        // Create grid lines for each beat
        beats.forEach(beat => {
            const beatLine = document.createElement('div');
            beatLine.className = 'beat-line';
            
            // Position the line
            const left = beat.time * this.options.pixelsPerSecond;
            
            beatLine.style.left = `${left}px`;
            beatLine.style.height = '100%';
            
            this.noteContainer.appendChild(beatLine);
        });
    }
    
    /**
     * Render time markers
     * @param {number} duration - Total duration in seconds
     * @param {number} interval - Interval between markers in seconds
     */
    renderTimeMarkers(duration, interval = 1) {
        // Create time markers
        for (let time = 0; time <= duration; time += interval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            
            // Position the marker
            const left = time * this.options.pixelsPerSecond;
            
            marker.style.left = `${left}px`;
            marker.textContent = `${time}s`;
            
            this.noteContainer.appendChild(marker);
        }
    }
    
    /**
     * Add zoom and scroll controls
     */
    addZoomControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'piano-roll-controls';
        
        // Zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.textContent = '+';
        zoomInBtn.onclick = () => this.zoom(1.2);
        
        // Zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.textContent = '-';
        zoomOutBtn.onclick = () => this.zoom(0.8);
        
        // Add to controls
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(zoomInBtn);
        
        // Add controls to container
        this.container.parentNode.insertBefore(controlsContainer, this.container);
    }
    
    /**
     * Zoom the piano roll
     * @param {number} factor - Zoom factor
     */
    zoom(factor) {
        this.options.pixelsPerSecond *= factor;
        
        // Update all note positions and widths
        const notes = this.noteContainer.querySelectorAll('.note');
        notes.forEach(note => {
            const left = parseFloat(note.style.left) * factor;
            const width = parseFloat(note.style.width) * factor;
            
            note.style.left = `${left}px`;
            note.style.width = `${width}px`;
        });
        
        // Update container width
        this.noteContainer.style.width = `${parseFloat(this.noteContainer.style.width) * factor}px`;
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PianoRollVisualizer;
}

// Initialize the Piano Roll Visualizer
document.addEventListener('DOMContentLoaded', () => {
    const pianoRoll = new PianoRollVisualizer('piano-roll-container', {
        height: 500,
        minPitch: 36,
        maxPitch: 84,
        pixelsPerSecond: 100,
        noteColorClass: 'original-note',
        showLabels: true
    });

    // Example usage: Render some notes
    const exampleNotes = [
        { pitch: 60, startTime: 0, endTime: 1, velocity: 100 },
        { pitch: 62, startTime: 1, endTime: 2, velocity: 100 },
        { pitch: 64, startTime: 2, endTime: 3, velocity: 100 }
    ];
    pianoRoll.renderNotes(exampleNotes, 3);

    const tracks = {
        strings: [
            { pitch: 60, startTime: 0, endTime: 1, velocity: 100 },
            { pitch: 62, startTime: 1, endTime: 2, velocity: 100 }
        ],
        brass: [
            { pitch: 64, startTime: 0.5, endTime: 1.5, velocity: 100 },
            { pitch: 65, startTime: 1.5, endTime: 2.5, velocity: 100 }
        ]
    };
    pianoRoll.renderMultipleTracks(tracks, 3);

    const beats = [
        { time: 0 },
        { time: 1 },
        { time: 2 },
        { time: 3 }
    ];
    pianoRoll.renderBeats(beats, 3);

    const audioAnalyzer = new AudioAnalyzer();
    const pitchDetector = new PitchDetector();

    // Example: Load audio and visualize extracted notes
    const loadAndVisualizeAudio = async (file) => {
        try {
            await audioAnalyzer.loadAudioFromFile(file);
            const analysis = audioAnalyzer.analyzeAudio();
            const extractedNotes = pitchDetector.extractNotes(analysis);

            // Render extracted notes
            pianoRoll.renderNotes(extractedNotes.all, analysis.duration);
        } catch (error) {
            console.error('Error loading or analyzing audio:', error);
        }
    };

    // File input event listener
    document.getElementById('midi-file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            loadAndVisualizeAudio(file);
        }
    });

    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        pianoRoll.zoom(1.2);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        pianoRoll.zoom(0.8);
    });

    const playNotes = (notes) => {
        const synth = new Tone.Synth().toDestination();
        notes.forEach(note => {
            synth.triggerAttackRelease(
                Tone.Frequency(note.pitch, 'midi').toNote(),
                note.endTime - note.startTime,
                Tone.now() + note.startTime
            );
        });
    };

    document.getElementById('play-remixed').addEventListener('click', () => {
        playNotes(exampleNotes); // Replace with actual notes
    });
});