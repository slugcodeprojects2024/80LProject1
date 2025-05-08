/**
 * Main application logic for the Syberia Music AI Remix project
 * Coordinates all components and handles user interactions
 */

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create piano roll instance
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

    // Add zoom button event listeners
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            pianoRoll.zoom(1.2);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            pianoRoll.zoom(0.8);
        });
    }

    // Function to play notes using Tone.js
    const playNotes = (notes) => {
        try {
            const synth = new Tone.Synth().toDestination();
            
            // Ensure AudioContext is started by user gesture
            if (Tone.context.state !== 'running') {
                Tone.context.resume();
            }
            
            notes.forEach(note => {
                synth.triggerAttackRelease(
                    Tone.Frequency(note.pitch, 'midi').toNote(),
                    note.endTime - note.startTime,
                    Tone.now() + note.startTime
                );
            });
        } catch (error) {
            console.error('Error playing notes:', error);
        }
    };

    // Play button event listener
    const playRemixedBtn = document.getElementById('play-remixed');
    if (playRemixedBtn) {
        playRemixedBtn.addEventListener('click', () => {
            playNotes(exampleNotes); // Replace with actual generated notes when available
        });
    }
    
    // Fix for AudioContext issue
    // This addresses the "AudioContext was not allowed to start" warning
    document.addEventListener('click', () => {
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
    }, { once: true });
    
    // Initialize other UI components
    initializeUI();
});

// Initialize UI components and event handlers
function initializeUI() {
    // Initialize file dropzone
    const dropArea = document.getElementById('drop-area');
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('highlight');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('highlight');
            });
        });
        
        dropArea.addEventListener('drop', handleDrop);
        
        // Open file selector when clicking the dropzone
        const fileSelectBtn = document.getElementById('file-select-btn');
        const midiFileInput = document.getElementById('midi-file-input');
        
        if (fileSelectBtn && midiFileInput) {
            fileSelectBtn.addEventListener('click', () => {
                midiFileInput.click();
            });
        }
    }
    
    // Handle dropped files
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            // Trigger the same handler used by the file input
            const midiFileInput = document.getElementById('midi-file-input');
            if (midiFileInput) {
                midiFileInput.files = files;
                midiFileInput.dispatchEvent(new Event('change'));
            }
        }
    }
    
    // Set current year in footer
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}