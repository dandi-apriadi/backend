// Test file to verify ESP32 hook import
import { useESP32Data } from './useESP32Data.js';

console.log('ESP32 hook imported successfully:', useESP32Data);

export default function TestComponent() {
    const esp32Data = useESP32Data();
    return null;
}
