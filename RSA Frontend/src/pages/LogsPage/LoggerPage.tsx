import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

type LogLevel = 'error' | 'warning' | 'info' | 'debug';
type LogEntry = {
    level: LogLevel;
    timestamp: string;
    message: string;
    env: string;
    version: string;
    nodeVersion: string;
    pid: number;
    stack?: string;
    code?: string;
    response?: {
        status: number;
        data: any;
    };
    doneBy: {
        id: string,
        user: {
            name: string
        }
    }
};


const LoggerPage: React.FC = () => {

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        errors: 0,
        warnings: 0,
        info: 0,
        debug: 0,
    });

    // Fetch logs from REST API on initial load
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get<LogEntry[]>('http://localhost:9000/logs');
                const normalizedLogs = res.data.map((log) => ({
                    ...log,
                    level: mapLevel(log.level),
                }));
                setLogs(normalizedLogs);
                console.log(normalizedLogs)
                calculateStats(normalizedLogs);
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            }
        };
        fetchLogs();
    }, []);

    // Normalize numeric log levels (30 = info, etc.)
    const mapLevel = (level: number | string): LogLevel => {
        if (typeof level === 'string') return 'info';
        if (level >= 50) return 'error';
        if (level >= 40) return 'warning';
        if (level >= 30) return 'info';
        return 'debug';
    };

    const calculateStats = (logs: LogEntry[]) => {
        const stats = {
            total: logs.length,
            errors: 0,
            warnings: 0,
            info: 0,
            debug: 0,
        };
        
        for (const log of logs) {
            const level = mapLevel(log.level);
            // @ts-ignore
            if (level in stats) stats[level]++;
        }
        setStats(stats);
    };

    const updateStats = (logEntry: LogEntry) => {
        setStats((prev) => ({
            total: prev.total + 1,
            errors: logEntry.level === 'error' ? prev.errors + 1 : prev.errors,
            warnings: logEntry.level === 'warning' ? prev.warnings + 1 : prev.warnings,
            info: logEntry.level === 'info' ? prev.info + 1 : prev.info,
            debug: logEntry.level === 'debug' ? prev.debug + 1 : prev.debug,
        }));
    };

    const filteredLogs = logs.filter((log) => {
        const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
        const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.stack?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesLevel && matchesSearch;
    });

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'error': return 'var(--danger)';
            case 'warning': return 'var(--warning)';
            case 'info': return 'var(--info)';
            case 'debug': return 'var(--primary)';
            default: return 'var(--gray)';
        }
    };
    const StatCard = ({ title, value, color }: { title: string, value: number, color: string }) => (
        <div className={`rounded-lg p-4 shadow ${color}`}>
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
    return (
        <div className="flex h-screen bg-gray-100 text-gray-800 font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-lg flex flex-col">
                <div className="text-2xl font-bold text-blue-600 p-6 border-b border-gray-200">
                    Log<span className="text-gray-900">View</span>
                </div>
                <ul className="flex-1 space-y-1 p-4">
                    {[
                        { label: 'All Logs', icon: 'fas fa-list', level: 'all' },
                        { label: 'Errors', icon: 'fas fa-times-circle', level: 'error' },
                        { label: 'Warnings', icon: 'fas fa-exclamation-triangle', level: 'warning' },
                        { label: 'Info', icon: 'fas fa-info-circle', level: 'info' },
                    ].map(({ label, icon, level }) => (
                        <li
                            key={level}
                            onClick={() => setFilterLevel(level as LogLevel | 'all')}
                            className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer hover:bg-blue-100 transition ${filterLevel === level ? 'bg-blue-500 text-white' : ''
                                }`}
                        >
                            <i className={`${icon} w-5`}></i>
                            <span>{label}</span>
                        </li>
                    ))}
                </ul>
                <div className="p-4 border-t border-gray-200 text-sm flex items-center space-x-2">
                    <i
                        className={`fas fa-circle text-xs ${isConnected ? 'text-green-500' : 'text-red-500'
                            }`}
                    ></i>
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold">Server Logs Dashboard</h1>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <i className="fas fa-search absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Total Logs" value={stats.total} color="bg-gray-200" />
                    <StatCard title="Errors" value={stats.errors} color="bg-gray-200" />
                    <StatCard title="Warnings" value={stats.warnings} color="bg-gray-200" />
                    <StatCard title="Info" value={stats.info} color="bg-gray-200" />
                </div>

                {/* Logs Table */}
                <div className="bg-black rounded-lg shadow overflow-auto min-h-80">

                    {filteredLogs.length > 0 ? (
                        filteredLogs.map((log, index) => (
                            <div className='ml-5 mt-1'>
                                <span className='text-purple-500'>{new Date(log.timestamp).toLocaleString()}</span>
                                <span className='text-cyan-500 mx-2'>[{log.level}]</span>
                                <span className='text-white mx-2'>
                                    <span>{log.message}</span>
                                    <span className='mx-2 text-yellow-500'>[Done By]</span>
                                    <pre>{JSON.stringify(log.doneBy, null, 2)}</pre>
                                    {log.stack && (
                                        <details className="mt-1 text-xs text-gray-600">
                                            <summary className="cursor-pointer text-blue-500">Stack Trace</summary>
                                            <pre className="whitespace-pre-wrap">{log.stack}</pre>
                                        </details>
                                    )}</span>
                            </div>
                            // <div>{log.env} (v{log.version})</div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500">No logs matching your criteria.</div>
                    )}
                </div>
            </div>
        </div>

    );
};

export default LoggerPage;