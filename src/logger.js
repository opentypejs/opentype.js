import { isBrowser } from './util.js';

/**
 * @typedef {number} ErrorTypes
 */

/**
 * @enum {ErrorTypes}
 */
const ErrorTypes = {
    ERROR: 1,
    WARNING: 2,
    DEPRECATED: 4,
    ALL: 32767
};
Object.freeze && Object.freeze(ErrorTypes);

/**
 * @enum {ErrorStrings}
 */
const errorStrings = {
    1: 'ERROR',
    2: 'WARNING',
    4: 'DEPRECATED'
};

const logMethods = {
    1: 'error',
    2: 'warn',
    4: 'info'
};

/**
 * @property {string} string - message string
 * @property {keyof ErrorTypes} type - error type
 */
class Message {
    constructor(string, type = ErrorTypes.ERROR) {
        if (!errorStrings[type]) {
            throw new Error( 'Invalid error type ' + type + ' for message: ' + string );
        }

        this.string = string;
        this.type = type;
    }

    toString() {
        return errorStrings[this.type] + ': ' + this.string;
    }
}

class MessageLogger {

    constructor() {
        this.logLevel = ErrorTypes.ALL;
        this.throwLevel = ErrorTypes.ERROR;
        this.ErrorTypes = ErrorTypes;
    }
    
    /**
     * Logs a message and fires the opentypejs:message Event.
     * @property {String|Message} string
     * @property {keyof ErrorTypes} type
     * 
     * @returns {Message}
     */
    add(stringOrMessage, type = ErrorTypes.ERROR) {
        let message;
        if (stringOrMessage instanceof Message) {
            message = stringOrMessage;
            type = message.type;
        } else {
            message = new Message(stringOrMessage, type);
        }

        let doLog = !!(this.logLevel & type);

        if (isBrowser()) {
            const messageEvent = new CustomEvent('opentypejs:message', {
                cancelable: true,
                detail: {
                    message,
                    doLog: doLog,
                    logger: this.logLevel
                }
            });
            const cancelled = document.dispatchEvent(messageEvent);
            if (cancelled) {
                doLog = false;
            }
        }
        
        if (doLog) {
            this.logMessage(message);
        }
    
        return message;
    }

    /**
     * adds an array of messages
     */
    adds(messageArray) {
        for (let i = 0; i < messageArray.length; i++) {
            this.add(messageArray[i]);
        }
    }
    
    /**
     * Logs a message to the console or throws it,
     * depending on the throwLevel setting.
     * @param {Message} message 
     */
    logMessage(message) {
        const type = message.type || ErrorTypes.ERROR;
        const logMethod = console[logMethods[type] || 'log'] || console.log;
        const logMessage = '[opentype.js] ' + message.toString();
        if ( this.throwLevel & type ) {
            throw new Error(logMessage);
        }
        logMethod(logMessage);
    }
    
    getLogLevel() {
        return this.logLevel;
    }

    setLogLevel(newLevel) {
        this.logLevel = newLevel;
    }

    getThrowLevel() {
        return this.throwLevel;
    }

    setThrowLevel(newLevel) {
        this.throwLevel = newLevel;
    }
    
}

const globalLogger = new MessageLogger();

export { ErrorTypes, Message, MessageLogger, globalLogger as logger };