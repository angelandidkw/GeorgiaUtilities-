// Global state for session status
let sessionActive = false;

/**
 * Set the current session state
 * @param {boolean} state - The state to set (true for active, false for inactive)
 */
const setSessionState = (state) => {
    if (typeof state !== 'boolean') {
        throw new TypeError('Session state must be a boolean value');
    }
    sessionActive = state;
};

/**
 * Get the current session state
 * @returns {boolean} Current session state
 */
const getSessionState = () => {
    return sessionActive;
};

/**
 * Toggle the current session state
 * @returns {boolean} New session state after toggle
 */
const toggleSessionState = () => {
    sessionActive = !sessionActive;
    return sessionActive;
};

module.exports = {
    setSessionState,
    getSessionState,
    toggleSessionState
}; 