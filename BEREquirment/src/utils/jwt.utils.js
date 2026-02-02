const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET_REFRESH_TOKEN = process.env.JWT_SECRET_REFRESH_TOKEN;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1);
}

const DEFAULT_CUSTOMER_EXPIRES_IN = process.env.JWT_CUSTOMER_EXPIRES_IN || '24h';
const DEFAULT_REFRESH_TOKEN_CUSTOMER_EXPIRES_IN = process.env.JWT_CUSTOMER_EXPIRES_IN || '24h';
const DEFAULT_ADMIN_EXPIRES_IN = process.env.JWT_ADMIN_EXPIRES_IN || '240h';
const DEFAULT_REFRESH_TOKEN_ADMIN_EXPIRES_IN = process.env.JWT_ADMIN_EXPIRES_IN || '240h';

const generateToken = (payload, userType) => {
    // if (!payload || !payload.id || !payload.role) {
    //     throw new Error('Payload for JWT must contain id and role.');
    // }
    console.log("payload", payload)
    const expiresIn = DEFAULT_ADMIN_EXPIRES_IN  ;
    const plainPayload = payload.toJSON ? payload.toJSON() : payload;
return jwt.sign(plainPayload, JWT_SECRET, { expiresIn });
};


// const generateRefreshToken = (payload, userType) => {
//     if (!payload || !payload.id || !payload.role) {
//         throw new Error('Payload for JWT must contain id and role.');
//     }
//     console.log("DEFAULT_REFRESH_TOKEN_CUSTOMER_EXPIRES_IN",DEFAULT_REFRESH_TOKEN_CUSTOMER_EXPIRES_IN)
//     console.log("DEFAULT_REFRESH_TOKEN_ADMIN_EXPIRES_IN",DEFAULT_REFRESH_TOKEN_ADMIN_EXPIRES_IN)
//     const expiresIn = userType === 'admin' ? DEFAULT_REFRESH_TOKEN_CUSTOMER_EXPIRES_IN : DEFAULT_REFRESH_TOKEN_ADMIN_EXPIRES_IN;
//     return jwt.sign(payload, JWT_SECRET_REFRESH_TOKEN, { expiresIn });
// };



const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET_REFRESH_TOKEN);
        return decoded;
    } catch (error) {
        throw error; 
    }
};

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        throw error; 
    }
};




const generateRefreshToken = (payload, userType) => {
    if (!payload) {
        throw new Error('Payload is required');
    }
    const plainPayload = payload.toJSON ? payload.toJSON() : payload;
    const expiresIn = userType === 'admin' 
        ? (process.env.JWT_ADMIN_EXPIRES_IN || '7d') 
        : (process.env.JWT_CUSTOMER_EXPIRES_IN || '24h');
    return jwt.sign(plainPayload, JWT_SECRET_REFRESH_TOKEN, { expiresIn });
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    verifyRefreshToken
};

