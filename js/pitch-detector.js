/**
 * Pitch Detector for the Syberia Music AI Remix project
 * Extracts notes from audio analysis data
 */

class PitchDetector {
    constructor() {
        // MIDI note frequency mapping - only need the ones in normal music range
        this.noteFrequencies = [];
        
        // Initialize the note frequencies (A0 to C8)
        for (let i = 21; i <= 108; i++) {
            // A4 is MIDI note 69 at 440Hz
            this.noteFrequencies[i] = 440 * Math.pow(2, (i - 69) / 12);
        }
        
        // Map for note names
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }
    
    /**
     * Convert frequency to nearest MIDI note number
     * @param {number} frequency - Frequency in Hz
     * @returns {number} - MIDI note number
     */
    frequencyToNote(frequency) {
        // A4 (69) is 440Hz
        // Formula: 12 * log2(f/440) + 69
        if (frequency <= 0) return 0;
        
        const noteNumber = Math.round(12 * Math.log2(frequency / 440) + 69);
        
        // Clamp to valid MIDI range (0-127)
        return Math.max(0, Math.min(127, noteNumber));
    }
    
    /**
     * Convert a MIDI note number to a note name
     * @param {number} midiNote - MIDI note number
     * @returns {string} - Note name (e.g., "C4")
     */
    midiNoteToName(midiNote) {
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = this.noteNames[midiNote % 12];
        return `${noteName}${octave}`;
    }
    
    /**
     * Convert a note name to MIDI note number
     * @param {string} noteName - Note name (e.g., "C4")
     * @returns {number} - MIDI note number
     */
    noteNameToMidi(noteName) {
        const pattern = /^([A-G][#b]?)(\d+)$/;
        const match = noteName.match(pattern);
        
        if (!match) {
            console.error('Invalid note name format:', noteName);
            return null;
        }
        
        const [, note, octave] = match;
        const noteIndex = this.noteNames.indexOf(note);
        
        if (noteIndex === -1) {
            console.error('Invalid note name:', note);
            return null;
        }
        
        return noteIndex + (parseInt(octave) + 1) * 12;
    }
    
    /**
     * Extract notes from audio analysis
     * @param {Object} audioFeatures - Features extracted by AudioAnalyzer
     * @param {Object} options - Options for note extraction
     * @returns {Object} - Extracted notes by instrument
     */
    extractNotes(audioFeatures, options = {}) {
        // Default options
        const defaultOptions = {
            minNoteDuration: 0.1,      // Minimum note duration in seconds
            silenceThreshold: 0.05,    // Amplitude threshold for silence
            pitchConfidenceThreshold: 0.8,  // Confidence threshold for pitch detection
            mergeThreshold: 0.15,      // Time threshold for merging notes (seconds)
            quantizeBeat: false,       // Whether to quantize to beats
            quantizeStrength: 0.5,     // How strongly to quantize (0-1)
            separateInstruments: true  // Whether to separate instruments
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Start with the peaks as potential note onsets
        const peaks = audioFeatures.peaks;
        const beatData = audioFeatures.beats;
        const frequencyData = audioFeatures.frequencies;
        
        // Initialize result object
        let extractedNotes = {
            all: [],
            strings: [],
            brass: [],
            woodwinds: [],
            percussion: []
        };
        
        // Extract notes from instrument tracks if available and separateInstruments is true
        if (opts.separateInstruments && audioFeatures.instruments) {
            // Process each instrument track
            for (const [instrument, trackData] of Object.entries(audioFeatures.instruments)) {
                const trackNotes = this.processTrackData(trackData, beatData, opts);
                
                // Map track to instrument family
                if (instrument === 'strings' || instrument === 'highMid' || instrument === 'mid') {
                    extractedNotes.strings.push(...trackNotes);
                } else if (instrument === 'brass' || instrument === 'lowMid') {
                    extractedNotes.brass.push(...trackNotes);
                } else if (instrument === 'woodwinds') {
                    extractedNotes.woodwinds.push(...trackNotes);
                } else if (instrument === 'percussion' || instrument === 'high') {
                    extractedNotes.percussion.push(...trackNotes);
                } else if (instrument === 'bass') {
                    // Add bass notes to strings and brass (could be either)
                    extractedNotes.strings.push(...trackNotes);
                }
                
                // Add to all notes
                extractedNotes.all.push(...trackNotes);
            }
        } else {
            // Process all peaks together
            extractedNotes.all = this.processTrackData(peaks, beatData, frequencyData, opts);
            
            // Assign all notes to strings by default
            extractedNotes.strings = [...extractedNotes.all];
        }
        
        // Sort all note collections by start time
        for (const collection of Object.values(extractedNotes)) {
            collection.sort((a, b) => a.startTime - b.startTime);
        }
        
        return extractedNotes;
    }
    
    /**
     * Process track data to extract notes
     * @param {Array} trackData - Track data from audio analysis
     * @param {Object} beatData - Beat information
     * @param {Array} frequencyData - Frequency analysis data
     * @param {Object} options - Options for note extraction
     * @returns {Array} - Extracted notes
     */
    processTrackData(trackData, beatData, frequencyData, options) {
        const notes = [];
        
        // If no track data, return empty array
        if (!trackData || trackData.length === 0) {
            return notes;
        }
        
        // Use peaks as note onsets
        for (let i = 0; i < trackData.length; i++) {
            const peakTime = trackData[i].time;
            let nextPeakTime;
            
            // Determine end time (next peak or end of audio)
            if (i < trackData.length - 1) {
                nextPeakTime = trackData[i + 1].time;
            } else {
                nextPeakTime = peakTime + 0.5; // Default to 0.5 seconds if last peak
            }
            
            // Skip if note is too short
            const noteDuration = nextPeakTime - peakTime;
            if (noteDuration < options.minNoteDuration) {
                continue;
            }
            
            // Find the dominant frequency for this note
            let frequency;
            
            if (trackData[i].frequency) {
                // Use the frequency directly if available
                frequency = trackData[i].frequency;
            } else if (frequencyData) {
                // Find closest frequency analysis point to this peak
                let closestFreq = null;
                let minTimeDiff = Infinity;
                
                for (const freq of frequencyData) {
                    const timeDiff = Math.abs(freq.time - peakTime);
                    if (timeDiff < minTimeDiff) {
                        minTimeDiff = timeDiff;
                        closestFreq = freq;
                    }
                }
                
                if (closestFreq) {
                    frequency = closestFreq.frequency;
                }
            }
            
            // Skip if no valid frequency found
            if (!frequency || frequency <= 0) {
                continue;
            }
            
            // Convert frequency to MIDI note
            const midiNote = this.frequencyToNote(frequency);
            
            // Add to notes
            notes.push({
                startTime: peakTime,
                endTime: nextPeakTime,
                duration: noteDuration,
                pitch: midiNote,
                frequency: frequency,
                velocity: Math.min(127, Math.round((trackData[i].magnitude || 0.8) * 127)) // Scale to MIDI velocity
            });
        }
        
        // Merge consecutive notes with the same pitch
        const mergedNotes = this.mergeConsecutiveNotes(notes, options.mergeThreshold);
        
        // Quantize to beats if requested
        let finalNotes = mergedNotes;
        if (options.quantizeBeat && beatData && beatData.beats.length > 0) {
            finalNotes = this.quantizeNotes(mergedNotes, beatData.beats, options.quantizeStrength);
        }
        
        return finalNotes;
    }
    
    /**
     * Merge consecutive notes with the same pitch
     * @param {Array} notes - Array of note objects
     * @param {number} threshold - Time threshold for merging (seconds)
     * @returns {Array} - Merged notes
     */
    mergeConsecutiveNotes(notes, threshold) {
        if (notes.length <= 1) {
            return notes;
        }
        
        // Sort by start time
        const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
        const mergedNotes = [];
        let currentNote = sortedNotes[0];
        
        for (let i = 1; i < sortedNotes.length; i++) {
            const nextNote = sortedNotes[i];
            
            // If next note starts close to current note end and has same pitch
            if (nextNote.startTime - currentNote.endTime <= threshold && 
                nextNote.pitch === currentNote.pitch) {
                // Merge by extending current note
                currentNote.endTime = nextNote.endTime;
                currentNote.duration = currentNote.endTime - currentNote.startTime;
                // Take max velocity
                currentNote.velocity = Math.max(currentNote.velocity, nextNote.velocity);
            } else {
                // Not mergeable, add current note to result and move to next
                mergedNotes.push(currentNote);
                currentNote = nextNote;
            }
        }
        
        // Add the last current note
        mergedNotes.push(currentNote);
        
        return mergedNotes;
    }
    
    /**
     * Quantize note timings to beats
     * @param {Array} notes - Array of note objects
     * @param {Array} beats - Array of beat timings
     * @param {number} strength - Quantization strength (0-1)
     * @returns {Array} - Quantized notes
     */
    quantizeNotes(notes, beats, strength) {
        const quantizedNotes = [];
        
        for (const note of notes) {
            // Find closest beat for start time
            let closestStartBeat = null;
            let minStartDiff = Infinity;
            
            for (const beat of beats) {
                const diff = Math.abs(note.startTime - beat.time);
                if (diff < minStartDiff) {
                    minStartDiff = diff;
                    closestStartBeat = beat.time;
                }
            }
            
            // Find closest beat for end time
            let closestEndBeat = null;
            let minEndDiff = Infinity;
            
            for (const beat of beats) {
                const diff = Math.abs(note.endTime - beat.time);
                if (diff < minEndDiff) {
                    minEndDiff = diff;
                    closestEndBeat = beat.time;
                }
            }
            
            // Only quantize if we found beats and they're within reasonable distance
            if (closestStartBeat !== null && closestEndBeat !== null) {
                // Calculate new timings with strength factor
                const newStartTime = note.startTime + (closestStartBeat - note.startTime) * strength;
                const newEndTime = note.endTime + (closestEndBeat - note.endTime) * strength;
                
                // Ensure end time is after start time
                const finalEndTime = Math.max(newStartTime + 0.1, newEndTime);
                
                quantizedNotes.push({
                    ...note,
                    startTime: newStartTime,
                    endTime: finalEndTime,
                    duration: finalEndTime - newStartTime
                });
            } else {
                // Keep original if no quantization possible
                quantizedNotes.push(note);
            }
        }
        
        return quantizedNotes;
    }
    
    /**
     * Convert extracted notes to a format compatible with our MIDI visualizer
     * @param {Object} extractedNotes - Object with notes by instrument
     * @returns {Object} - Object with notes and metadata
     */
    formatForMIDI(extractedNotes) {
        // Initialize result with all note categories
        const result = {};
        
        // Process each instrument track
        for (const [instrument, notes] of Object.entries(extractedNotes)) {
            // Skip if no notes
            if (!notes || notes.length === 0) {
                continue;
            }
            
            // Sort notes by start time
            const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
            
            // Extract pitches and durations for Markov/L-system processing
            const pitches = sortedNotes.map(note => note.pitch);
            const durations = sortedNotes.map(note => note.duration);
            
            result[instrument] = {
                notes: sortedNotes,
                pitches: pitches,
                durations: durations
            };
        }
        
        return result;
    }
    
    /**
     * Generate MIDI-compatible data structure for visualization or playback
     * @param {Object} extractedNotes - Object with notes by instrument
     * @returns {Object} - MIDI-compatible data structure
     */
    generateMIDIData(extractedNotes) {
        // Create tracks for each instrument family
        const tracks = [];
        const instrumentMap = {
            strings: { name: "Strings", programNumber: 48 },  // String Ensemble
            brass: { name: "Brass", programNumber: 61 },      // Brass Section
            woodwinds: { name: "Woodwinds", programNumber: 71 }, // Clarinet
            percussion: { name: "Percussion", programNumber: 118 } // Synth Drum
        };
        
        // Track ID counter
        let trackId = 0;
        
        // Create a track for each instrument family
        for (const [instrument, data] of Object.entries(extractedNotes)) {
            // Skip 'all' category and empty tracks
            if (instrument === 'all' || !data || data.length === 0) {
                continue;
            }
            
            // Get instrument info
            const instrInfo = instrumentMap[instrument] || { name: "Piano", programNumber: 0 };
            
            // Create track
            const track = {
                id: trackId++,
                name: instrInfo.name,
                instrument: instrInfo.name,
                instrumentNumber: instrInfo.programNumber,
                notes: data.map(note => ({
                    pitch: note.pitch,
                    velocity: note.velocity || 64,
                    startTime: note.startTime,
                    endTime: note.endTime
                }))
            };
            
            tracks.push(track);
        }
        
        // If no instrument-specific tracks, create one track with all notes
        if (tracks.length === 0 && extractedNotes.all && extractedNotes.all.length > 0) {
            const track = {
                id: 0,
                name: "Extracted Audio",
                instrument: "Piano",
                instrumentNumber: 0,
                notes: extractedNotes.all.map(note => ({
                    pitch: note.pitch,
                    velocity: note.velocity || 64,
                    startTime: note.startTime,
                    endTime: note.endTime
                }))
            };
            
            tracks.push(track);
        }
        
        // MIDI data structure that mimics our MIDI handler output
        const midiData = {
            info: {
                format: 1,
                trackCount: tracks.length,
                timeDivision: 480, // Standard MIDI ticks
                tracks: tracks
            }
        };
        
        return midiData;
    }
    
    /**
     * Convert note names to MIDI note numbers
     * @param {Array} noteNames - Array of note names
     * @returns {Array} - Array of MIDI note numbers
     */
    convertThemeToMidi(noteNames) {
        return noteNames.map(noteName => {
            const midi = this.noteNameToMidi(noteName);
            if (midi === null) {
                console.warn(`Invalid note name: ${noteName}`);
                return 60; // Default to middle C if invalid
            }
            return midi;
        });
    }
    
    /**
     * Incorporate score themes into extracted notes
     * @param {Object} extractedNotes - Object with notes by instrument
     * @param {Array} themes - Array of theme objects from score analysis
     * @returns {Object} - Modified notes incorporating themes
     */
    incorporateThemes(extractedNotes, themes) {
        // If no themes, return original notes
        if (!themes || themes.length === 0) {
            return extractedNotes;
        }
        
        // Deep clone the notes to avoid modifying the original
        const modifiedNotes = JSON.parse(JSON.stringify(extractedNotes));
        
        // Process each theme
        for (const theme of themes) {
            // Convert theme notes to MIDI if needed
            const themeMidi = Array.isArray(theme.notes) ? 
                (typeof theme.notes[0] === 'string' ? this.convertThemeToMidi(theme.notes) : theme.notes) : 
                [];
            
            if (themeMidi.length === 0) {
                continue;
            }
            
            // Find suitable places to insert the theme in each instrument
            for (const [instrument, data] of Object.entries(modifiedNotes)) {
                // Skip 'all' category
                if (instrument === 'all' || !data || data.length === 0) {
                    continue;
                }
                
                // Get notes for this instrument
                const notes = Array.isArray(data) ? data : data.notes;
                
                if (!notes || notes.length === 0) {
                    continue;
                }
                
                // Find suitable section to replace with theme
                // (e.g., start of phrases, after long notes)
                const insertPoints = [];
                
                // Look for phrase beginnings (after rests or long notes)
                for (let i = 1; i < notes.length; i++) {
                    const prevNote = notes[i - 1];
                    const currentNote = notes[i];
                    
                    // If there's a gap between notes or previous note was long
                    if (currentNote.startTime - prevNote.endTime > 0.2 || prevNote.duration > 0.5) {
                        insertPoints.push(i);
                    }
                }
                
                // Insert theme at the first insertion point if found
                if (insertPoints.length > 0) {
                    const insertIndex = insertPoints[0];
                    const baseTime = notes[insertIndex].startTime;
                    
                    // Create theme notes
                    const themeNotes = themeMidi.map((pitch, i) => {
                        const duration = i < themeMidi.length - 1 ? 0.25 : 0.5; // Longer last note
                        return {
                            pitch: pitch,
                            startTime: baseTime + i * 0.25, // Quarter note spacing
                            endTime: baseTime + i * 0.25 + duration,
                            duration: duration,
                            velocity: 80 // Medium velocity
                        };
                    });
                    
                    // Replace some notes with theme
                    const notesToReplace = Math.min(themeNotes.length, 4); // Replace up to 4 notes
                    notes.splice(insertIndex, notesToReplace, ...themeNotes);
                }
            }
        }
        
        return modifiedNotes;
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PitchDetector;
}