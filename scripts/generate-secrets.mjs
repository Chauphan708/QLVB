import {randomBytes} from 'node:crypto';
console.log('APP_SECRET='+randomBytes(32).toString('base64url'));
console.log('ADMIN_PASSWORD='+randomBytes(24).toString('base64url'));
