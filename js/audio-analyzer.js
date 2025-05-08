/**
 * Audio Analyzer for the Syberia Music AI Remix project
 * Handles loading and analyzing MP3 files using Web Audio API
 */

class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.isPlaying = false;
        this.peakData = null;
        this.beatData = null;
        this.frequencyData = null;
        
        // Frequency ranges for different instrument families (in Hz)
        this.instrumentRanges = {
            bass: [20, 250],         // Lower instruments, bass lines
            lowMid: [250, 500],      // Lower register instruments
            mid: [500, 2000],        // Middle register instruments
            highMid: [2000, 5000],   // Higher register instruments
            high: [5000, 20000]      // Highest instruments
        };
        
        // Initialize audio context
        this.initAudioContext();
    }
    
    /**
     * Initialize the Web Audio API context
     */
    initAudioContext() {
        try {
            // Create an audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            console.log('Audio context initialized');
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
    }
    
    /**
     * Resume audio context (needed due to autoplay policy)
     */
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    /**
     * Load an audio file from URL
     * @param {string} url - URL of the audio file
     * @returns {Promise} - Promise resolving to the loaded audio buffer
     */
    loadAudioFile(url) {
        return new Promise((resolve, reject) => {
            if (!this.audioContext) {
                return reject(new Error('Audio context not initialized'));
            }
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.audioBuffer = audioBuffer;
                    console.log('Audio file loaded', {
                        duration: audioBuffer.duration,
                        numberOfChannels: audioBuffer.numberOfChannels,
                        sampleRate: audioBuffer.sampleRate
                    });
                    resolve(audioBuffer);
                })
                .catch(error => {
                    console.error('Error loading audio file:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Load an audio file from a File object
     * @param {File} file - Audio file object
     * @returns {Promise} - Promise resolving to the loaded audio buffer
     */
    loadAudioFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.audioContext) {
                return reject(new Error('Audio context not initialized'));
            }
            
            const reader = new FileReader();
            
            reader.onload = e => {
                const arrayBuffer = e.target.result;
                
                this.audioContext.decodeAudioData(arrayBuffer)
                    .then(audioBuffer => {
                        this.audioBuffer = audioBuffer;
                        console.log('Audio file loaded', {
                            duration: audioBuffer.duration,
                            numberOfChannels: audioBuffer.numberOfChannels,
                            sampleRate: audioBuffer.sampleRate
                        });
                        resolve(audioBuffer);
                    })
                    .catch(error => {
                        console.error('Error decoding audio data:', error);
                        reject(error);
                    });
            };
            
            reader.onerror = error => {
                console.error('Error reading audio file:', error);
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Play the loaded audio
     */
    playAudio() {
        if (!this.audioBuffer) {
            console.error('No audio loaded to play');
            return;
        }
        
        // Resume context if suspended
        this.resumeContext();
        
        // Stop any current playback
        if (this.isPlaying) {
            this.stopAudio();
        }
        
        // Create a new source
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.connect(this.audioContext.destination);
        
        this.audioSource.onended = () => {
            this.isPlaying = false;
            this.audioSource = null;
        };
        
        // Start playback
        this.audioSource.start();
        this.isPlaying = true;
    }
    
    /**
     * Stop audio playback
     */
    stopAudio() {
        if (this.audioSource && this.isPlaying) {
            this.audioSource.stop();
            this.isPlaying = false;
            this.audioSource = null;
        }
    }
    
    /**
     * Analyze the loaded audio to extract features
     * @param {Object} options - Analysis options
     * @returns {Object} - Extracted features
     */
    analyzeAudio(options = {}) {
        if (!this.audioBuffer) {
            throw new Error('No audio loaded to analyze');
        }
        
        // Default options
        const defaultOptions = {
            windowSize: 2048,     // FFT size
            hopSize: 512,         // Hop size between windows
            smoothingFactor: 0.8, // For envelope smoothing
            minPeakDistance: 0.1, // Minimum peak distance in seconds
            peakThreshold: 0.2,   // Peak threshold as fraction of max
            separateInstruments: true // Whether to separate frequency bands
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Extract raw audio data from the buffer (mono mix if stereo)
        const rawData = this.getMonoAudioData();
        
        console.log('Analyzing audio...');
        
        // Analyze the audio using various methods
        const envelope = this.extractEnvelope(rawData, opts);
        const peaks = this.findPeaks(rawData, envelope, opts);
        const beats = this.detectBeats(rawData, peaks, opts);
        
        // Full spectrum frequency analysis
        const frequencies = this.analyzeFrequencies(rawData, peaks, opts);
        
        // For caching
        this.peakData = peaks;
        this.beatData = beats;
        this.frequencyData = frequencies;
        
        // Separate by instrument families if requested
        let instrumentTracks = {};
        if (opts.separateInstruments) {
            instrumentTracks = this.separateInstrumentTracks(frequencies, peaks, beats, opts);
        }
        
        return {
            // Envelope information (amplitude over time)
            envelope: envelope,
            
            // Found peaks (potential note onsets)
            peaks: peaks,
            
            // Estimated tempo and beats
            beats: beats,
            
            // Extract frequency information
            frequencies: frequencies,
            
            // Instrument separation
            instruments: instrumentTracks,
            
            // Basic stats
            duration: this.audioBuffer.duration,
            sampleRate: this.audioBuffer.sampleRate
        };
    }
    
    /**
     * Get mono audio data from the buffer
     * @returns {Float32Array} - Mono audio data
     */
    getMonoAudioData() {
        const numChannels = this.audioBuffer.numberOfChannels;
        const length = this.audioBuffer.length;
        const monoData = new Float32Array(length);
        
        if (numChannels === 1) {
            // Already mono
            this.audioBuffer.copyFromChannel(monoData, 0);
        } else {
            // Mix down to mono
            const left = new Float32Array(length);
            const right = new Float32Array(length);
            
            this.audioBuffer.copyFromChannel(left, 0);
            this.audioBuffer.copyFromChannel(right, 1);
            
            for (let i = 0; i < length; i++) {
                monoData[i] = (left[i] + right[i]) / 2;
            }
        }
        
        return monoData;
    }
    
    /**
     * Extract amplitude envelope from audio data
     * @param {Float32Array} audioData - Mono audio data
     * @param {Object} options - Analysis options
     * @returns {Object} - Envelope data
     */
    extractEnvelope(audioData, options) {
        const sampleRate = this.audioBuffer.sampleRate;
        const length = audioData.length;
        
        // We'll calculate RMS energy over windows
        const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
        const hopSize = Math.floor(windowSize / 2); // 50% overlap
        const numWindows = Math.floor((length - windowSize) / hopSize) + 1;
        
        const envelope = new Float32Array(numWindows);
        const timePoints = new Float32Array(numWindows);
        
        // Calculate RMS energy for each window
        for (let i = 0; i < numWindows; i++) {
            const offset = i * hopSize;
            let sum = 0;
            
            for (let j = 0; j < windowSize; j++) {
                if (offset + j < audioData.length) {
                    const sample = audioData[offset + j];
                    sum += sample * sample;
                }
            }
            
            // Root mean square
            envelope[i] = Math.sqrt(sum / windowSize);
            timePoints[i] = offset / sampleRate;
        }
        
        // Apply smoothing if specified
        if (options.smoothingFactor > 0) {
            const smoothed = new Float32Array(numWindows);
            smoothed[0] = envelope[0]; // Keep first value
            
            for (let i = 1; i < numWindows; i++) {
                smoothed[i] = options.smoothingFactor * smoothed[i - 1] + 
                              (1 - options.smoothingFactor) * envelope[i];
            }
            
            return {
                values: smoothed,
                times: timePoints,
                windowSize: windowSize,
                hopSize: hopSize
            };
        }
        
        return {
            values: envelope,
            times: timePoints,
            windowSize: windowSize,
            hopSize: hopSize
        };
    }
    
    /**
     * Find peaks in the audio data (potential note onsets)
     * @param {Float32Array} audioData - Mono audio data
     * @param {Object} envelope - Amplitude envelope data
     * @param {Object} options - Analysis options
     * @returns {Array} - Array of detected peaks
     */
    findPeaks(audioData, envelope, options) {
        if (this.peakData) {
            return this.peakData; // Return cached result if available
        }
        
        const envValues = envelope.values;
        const times = envelope.times;
        
        // Calculate the threshold as a fraction of the maximum value
        const maxValue = Math.max(...envValues);
        const threshold = maxValue * options.peakThreshold;
        
        const peaks = [];
        
        // Find peaks above threshold
        for (let i = 1; i < envValues.length - 1; i++) {
            const prev = envValues[i - 1];
            const curr = envValues[i];
            const next = envValues[i + 1];
            
            // Is this a local maximum above threshold?
            if (curr > threshold && curr > prev && curr > next) {
                peaks.push({
                    index: i,
                    time: times[i],
                    value: curr
                });
            }
        }
        
        // Filter out peaks that are too close (keep the stronger one)
        const minPeakDistance = options.minPeakDistance;
        const filteredPeaks = [];
        
        for (let i = 0; i < peaks.length; i++) {
            const peak = peaks[i];
            
            // Check if this peak is too close to any filtered peak
            let tooClose = false;
            for (let j = 0; j < filteredPeaks.length; j++) {
                const existingPeak = filteredPeaks[j];
                const timeDiff = Math.abs(peak.time - existingPeak.time);
                
                if (timeDiff < minPeakDistance) {
                    tooClose = true;
                    // Keep the stronger peak
                    if (peak.value > existingPeak.value) {
                        filteredPeaks[j] = peak;
                    }
                    break;
                }
            }
            
            // Add to filtered peaks if not too close to any existing peak
            if (!tooClose) {
                filteredPeaks.push(peak);
            }
        }
        
        // Sort by time for consistency
        filteredPeaks.sort((a, b) => a.time - b.time);
        
        return filteredPeaks;
    }
    
    /**
     * Detect beats in the audio
     * @param {Float32Array} audioData - Mono audio data
     * @param {Array} peaks - Detected peaks
     * @param {Object} options - Analysis options
     * @returns {Object} - Beat information
     */
    detectBeats(audioData, peaks, options) {
        if (this.beatData) {
            return this.beatData; // Return cached result if available
        }
        
        // Use the peaks as a starting point
        if (!peaks || peaks.length === 0) {
            peaks = this.findPeaks(audioData, this.extractEnvelope(audioData, options), options);
        }
        
        // Calculate intervals between peaks
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i].time - peaks[i - 1].time);
        }
        
        // Group similar intervals to find the tempo
        const tempoGroups = {};
        
        for (const interval of intervals) {
            // Round to nearest 10ms
            const rounded = Math.round(interval * 100) / 100;
            tempoGroups[rounded] = (tempoGroups[rounded] || 0) + 1;
        }
        
        // Find the most common interval
        let maxCount = 0;
        let mostCommonInterval = 0;
        
        for (const [interval, count] of Object.entries(tempoGroups)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonInterval = parseFloat(interval);
            }
        }
        
        // Calculate tempo from interval
        const tempoBPM = mostCommonInterval > 0 ? 60 / mostCommonInterval : 120;
        
        // Generate regular beats based on estimated tempo
        const duration = this.audioBuffer.duration;
        const beatInterval = 60 / tempoBPM;
        const regularBeats = [];
        
        for (let time = 0; time < duration; time += beatInterval) {
            regularBeats.push({
                time: time,
                confidence: 1.0 // Perfect confidence for regular beats
            });
        }
        
        // Find actual beats by looking for peaks near the regular beats
        const actualBeats = [];
        
        for (const regularBeat of regularBeats) {
            // Find closest peak to this regular beat
            let closestPeak = null;
            let minDiff = 0.1; // Maximum 100ms difference to consider
            
            for (const peak of peaks) {
                const diff = Math.abs(peak.time - regularBeat.time);
                if (diff < minDiff) {
                    closestPeak = peak;
                    minDiff = diff;
                }
            }
            
            if (closestPeak) {
                actualBeats.push({
                    time: closestPeak.time,
                    confidence: 1.0 - minDiff / 0.1 // Higher confidence for closer peaks
                });
            } else {
                // Use the theoretical beat if no peak found
                actualBeats.push(regularBeat);
            }
        }
        
        this.beatData = {
            tempo: tempoBPM,
            beats: actualBeats,
            peakIntervals: intervals
        };
        
        return this.beatData;
    }
    
    /**
     * Analyze frequencies to extract pitch information
     * @param {Float32Array} audioData - Mono audio data
     * @param {Array} peaks - Detected peaks
     * @param {Object} options - Analysis options
     * @returns {Array} - Frequency analysis data
     */
    analyzeFrequencies(audioData, peaks, options) {
        if (this.frequencyData) {
            return this.frequencyData; // Return cached result if available
        }
        
        const sampleRate = this.audioBuffer.sampleRate;
        const fftSize = options.windowSize || 2048;
        const hopSize = options.hopSize || 512;
        
        // Create offline context for analysis
        const offlineContext = new OfflineAudioContext(1, audioData.length, sampleRate);
        
        // Create buffer with audio data
        const audioBuffer = offlineContext.createBuffer(1, audioData.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        channelData.set(audioData);
        
        // Create analyzer node
        const analyzer = offlineContext.createAnalyser();
        analyzer.fftSize = fftSize;
        analyzer.smoothingTimeConstant = 0;
        
        // Connect source to analyzer
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyzer);
        analyzer.connect(offlineContext.destination);
        
        // Start the source
        source.start(0);
        
        // Number of windows to analyze
        const numWindows = Math.floor((audioData.length - fftSize) / hopSize) + 1;
        
        // Arrays to hold results
        const frequencyData = new Float32Array(analyzer.frequencyBinCount);
        const timeData = new Float32Array(fftSize);
        const results = [];
        
        // Calculate time points for each window
        const timePoints = [];
        for (let i = 0; i < numWindows; i++) {
            timePoints.push(i * hopSize / sampleRate);
        }
        
        // Render and analyze
        offlineContext.startRendering().then(renderedBuffer => {
            const renderedData = renderedBuffer.getChannelData(0);
            
            // Process each window
            for (let i = 0; i < numWindows; i++) {
                const offset = i * hopSize;
                
                // Copy time domain data for this window
                for (let j = 0; j < fftSize; j++) {
                    if (offset + j < renderedData.length) {
                        timeData[j] = renderedData[offset + j];
                    } else {
                        timeData[j] = 0;
                    }
                }
                
                // Apply window function (Hann)
                for (let j = 0; j < fftSize; j++) {
                    timeData[j] *= 0.5 * (1 - Math.cos(2 * Math.PI * j / fftSize));
                }
                
                // Perform FFT
                const fft = new FFT(fftSize);
                fft.forward(timeData);
                const complexOutput = fft.spectrum;
                
                // Convert to magnitude spectrum
                for (let j = 0; j < analyzer.frequencyBinCount; j++) {
                    const real = complexOutput[j * 2];
                    const imag = complexOutput[j * 2 + 1];
                    frequencyData[j] = Math.sqrt(real * real + imag * imag);
                }
                
                // Find dominant frequency
                let maxValue = -Infinity;
                let maxIndex = 0;
                
                for (let j = 0; j < frequencyData.length; j++) {
                    if (frequencyData[j] > maxValue) {
                        maxValue = frequencyData[j];
                        maxIndex = j;
                    }
                }
                
                // Convert to Hz
                const dominantFreq = maxIndex * sampleRate / fftSize;
                
                // Calculate time for this window
                const time = offset / sampleRate;
                
                // Store result
                results.push({
                    time: time,
                    frequency: dominantFreq,
                    magnitude: maxValue,
                    spectrum: Array.from(frequencyData) // Convert to regular array for easier serialization
                });
            }
        }).catch(err => console.error('Rendering failed:', err));
        
        // Simple FFT implementation for offline context
        function FFT(size) {
            this.size = size;
            this.spectrum = new Float32Array(size * 2);
            
            this.forward = function(input) {
                // Simple FFT implementation
                // This is a placeholder - in a real implementation, use a proper FFT library
                // like KissFFT or DSP.js
                
                // For now, just copy the input to the spectrum real part and zero out imaginary
                for (let i = 0; i < size; i++) {
                    this.spectrum[i * 2] = input[i];     // Real part
                    this.spectrum[i * 2 + 1] = 0;        // Imaginary part
                }
                
                // TODO: Implement actual FFT algorithm
            };
        }
        
        this.frequencyData = results;
        return results;
    }
    
    /**
     * Separate audio into instrument tracks based on frequency bands
     * @param {Array} frequencies - Frequency analysis data
     * @param {Array} peaks - Detected peaks
     * @param {Object} beats - Beat information
     * @param {Object} options - Analysis options
     * @returns {Object} - Separated instrument tracks
     */
    separateInstrumentTracks(frequencies, peaks, beats, options) {
        // Define frequency ranges for instrument families
        const ranges = {
            bass: [20, 250],           // Bass instruments
            lowMid: [250, 500],        // Low-mid instruments (low brass, cello)
            mid: [500, 2000],          // Mid-range instruments (violins, woodwinds)
            highMid: [2000, 5000],     // High-mid instruments (flutes, piccolo)
            high: [5000, 20000]        // High frequencies (cymbals, percussion)
        };
        
        // Create a track for each range
        const tracks = {};
        
        for (const [rangeName, [minFreq, maxFreq]] of Object.entries(ranges)) {
            tracks[rangeName] = [];
            
            // Find peaks that have dominant frequency in this range
            for (const peak of peaks) {
                // Find closest frequency analysis point to this peak
                const peakTime = peak.time;
                let closestFreq = null;
                let minTimeDiff = Infinity;
                
                for (const freq of frequencies) {
                    const timeDiff = Math.abs(freq.time - peakTime);
                    if (timeDiff < minTimeDiff) {
                        minTimeDiff = timeDiff;
                        closestFreq = freq;
                    }
                }
                
                if (closestFreq) {
                    // Check if dominant frequency is in this range
                    if (closestFreq.frequency >= minFreq && closestFreq.frequency <= maxFreq) {
                        // Add to this track
                        tracks[rangeName].push({
                            time: peakTime,
                            frequency: closestFreq.frequency,
                            magnitude: closestFreq.magnitude
                        });
                    }
                }
            }
        }
        
        // Map ranges to instrument families
        const instrumentTracks = {
            strings: [...tracks.mid, ...tracks.highMid],       // Strings cover mid to high-mid
            brass: [...tracks.lowMid, ...tracks.mid],          // Brass covers low-mid to mid
            woodwinds: [...tracks.mid, ...tracks.highMid],     // Woodwinds cover mid to high-mid
            percussion: [...tracks.high],                      // Percussion mostly high frequencies
            bass: [...tracks.bass]                             // Bass instruments
        };
        
        // Sort each track by time
        for (const track of Object.values(instrumentTracks)) {
            track.sort((a, b) => a.time - b.time);
        }
        
        return instrumentTracks;
    }
}

// Export the class for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioAnalyzer;
}