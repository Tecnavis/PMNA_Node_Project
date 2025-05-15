module.exports = function realTimeTransport(opts) {
    const { io } = opts; 

    return {
        async write(log) {
            try {
                const logObject = JSON.parse(log);
                console.log("New evetn emited from server <")
                io.emit('log', logObject);
            } catch (error) {
                console.error('Error in real-time transport:', error);
            }
        }
    }
}