import React, { useEffect, useState, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Blink animation for danger indicator
const blinkBackground = keyframes`
    0% { background-color: #f8f9fa; }
    25% { background-color: #e74c3c; }
    50% { background-color: #f8f9fa; }
    75% { background-color: #e74c3c; }
    100% { background-color: #f8f9fa; }
`;

// Styling for the timer container
const TimerContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 10px;
    border-radius: 5px;
    background: linear-gradient(145deg, #f8f9fa, #e2e6ea);
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
    font-family: 'Arial', sans-serif;
    color: #333;
    font-size: 16px;
    font-weight: bold;
    width: 200px;
`;

// Styling for the timer text, which blinks if time is up
const TimerText = styled.span<{ isBlinking: boolean }>`
    display: inline-block;
    font-size: 16px;
    color: ${({ isBlinking }) => (isBlinking ? '#fff' : '#e67e22')};
    background-color: ${({ isBlinking }) => (isBlinking ? '#e74c3c' : '#f8f9fa')};
    ${({ isBlinking }) =>
        isBlinking &&
        css`
            animation: ${blinkBackground} 1s infinite;
            padding: 2px 4px;
            border-radius: 3px;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
        `}
`;

interface TimerProps {
    pickupDistance?: string;
    onTimeUp: () => void;
}

const Timer: React.FC<TimerProps> = ({ pickupDistance, onTimeUp }) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null); // Reference for the audio element

    const calculatePickupTime = (distance: string) => {
        const km = parseFloat(distance) || 0;
        const speedKmPerMin = 1;
        return Math.ceil(km / speedKmPerMin) + 15; // Add 15 min buffer
    };

    useEffect(() => {
        const storedStartTime = localStorage.getItem('pickupStartTime');
        let startTime = storedStartTime ? parseInt(storedStartTime) : Date.now(); // Default to current time

        if (!storedStartTime) {
            localStorage.setItem('pickupStartTime', startTime.toString());
        }

        // Calculate the time needed to complete the pickup
        const totalPickupTime = calculatePickupTime(pickupDistance || '0') * 60 * 1000;

        const updateTimer = () => {
            const currentTime = Date.now();
            const timeElapsed = currentTime - startTime; // No longer null

            if (timeElapsed >= totalPickupTime) {
                setIsTimeUp(true);
                onTimeUp(); // Trigger time up action
            } else {
                setElapsedTime(timeElapsed);
            }
        };

        const timerInterval = setInterval(updateTimer, 1000);

        return () => {
            clearInterval(timerInterval);
        };
    }, [pickupDistance, onTimeUp]);

    // Play alert sound when time is up
    useEffect(() => {
        if (isTimeUp && audioRef.current) {
            audioRef.current.play();
        }
    }, [isTimeUp]);

    // Convert milliseconds to minutes and seconds for display
    const formatTime = (time: number) => {
        const totalSeconds = Math.floor(time / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div>
            <TimerContainer>
                <TimerText isBlinking={isTimeUp}>
                    {isTimeUp ? 'Time Up!' : formatTime(elapsedTime)}
                </TimerText>
            </TimerContainer>

            {/* Audio element for the alert sound */}
            <audio ref={audioRef} src="\public\short-beep-countdown-81121.mp3" preload="auto" />
        </div>
    );
};

export default Timer;