import { useState } from 'react';

/**
 * Static version of data consistency check - no automatic verification
 */
export const useDataConsistencyVerification = ({
    localData,
    serverData,
    refreshFunction,
    verificationInterval = 15000, // Unused in static mode
    onInconsistencyDetected // Unused in static mode
}) => {
    // Always consistent in static mode
    const [isConsistent, setIsConsistent] = useState(true);
    const [inconsistencies, setInconsistencies] = useState([]);

    // No automatic verification
    // No useEffect hooks that would run checks

    // Function to resolve inconsistencies manually
    const resolveInconsistency = () => {
        setIsConsistent(true);
        setInconsistencies([]);
    };

    // Function to simulate inconsistency for testing
    const simulateInconsistency = () => {
        setIsConsistent(false);
        setInconsistencies([
            { field: 'voltage', local: 220, server: 221 },
            { field: 'power', local: 1100, server: 1120 }
        ]);
    };

    return {
        isConsistent,
        inconsistencies,
        resolveInconsistency,
        simulateInconsistency
    };
};

export default useDataConsistencyVerification;
