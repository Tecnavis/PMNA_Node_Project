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
    min-width: 100px;
`;

const TimerText = styled.span<{ $isBlinking: boolean }>`
    display: inline-block;
    font-size: 16px;
    color: ${({ $isBlinking }) => ($isBlinking ? '#fff' : '#e67e22')};
    background-color: ${({ $isBlinking }) => ($isBlinking ? '#e74c3c' : 'transparent')};
    ${({ $isBlinking }) =>
        $isBlinking &&
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

const Timer: React.FC<TimerProps> = ({ pickupDistance = '0', onTimeUp }) => {
    const [remainingTime, setRemainingTime] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [totalPickupTime, setTotalPickupTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Calculate pickup time based on distance
    const calculatePickupTime = (distance: string) => {
        const km = parseFloat(distance) || 0;
        const speedKmPerMin = 1; // 1 km per minute (60 km/h)
        return Math.ceil(km / speedKmPerMin) + 15; // Add 15 min buffer
    };

    useEffect(() => {
        // Calculate total time needed when distance changes
        const time = calculatePickupTime(pickupDistance) * 60 * 1000;
        setTotalPickupTime(time);
        setRemainingTime(time);
        
        const storedStartTime = localStorage.getItem('pickupStartTime');
        const startTime = storedStartTime ? parseInt(storedStartTime) : Date.now();

        if (!storedStartTime) {
            localStorage.setItem('pickupStartTime', startTime.toString());
        }

        const timerInterval = setInterval(() => {
            const currentTime = Date.now();
            const timeElapsed = currentTime - startTime;
            const timeRemaining = Math.max(0, time - timeElapsed);

            if (timeRemaining <= 0) {
                setIsTimeUp(true);
                onTimeUp();
                clearInterval(timerInterval);
            }
            setRemainingTime(timeRemaining);
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [pickupDistance, onTimeUp]);

    useEffect(() => {
        if (isTimeUp && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        }
    }, [isTimeUp]);

    // Format time as HHH:MM (hours:minutes)
    const formatTime = (time: number) => {
        const totalSeconds = Math.floor(time / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        // Format as HHH:MM (padded with leading zeros)
        return `${hours.toString().padStart(3, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            <TimerContainer>
                <TimerText $isBlinking={isTimeUp}>
                    {isTimeUp ? 'Time Up!' : formatTime(remainingTime)}
                </TimerText>
            </TimerContainer>
            
            <audio 
                ref={audioRef} 
                src="/short-beep-countdown-81121.mp3"
                preload="auto" 
            />
        </div>
    );
};

export default Timer;