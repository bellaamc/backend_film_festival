import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'

const updateUserImage = async (filename: string, userId: number) : Promise<ResultSetHeader> => {
    Logger.info(`Updating user ${userId}'s image in the database`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = ? where id = ?';
    const [ result ] = await conn.query( query, [ filename, userId ] );
    await conn.release();
    return result;
};

const deleteUserImage = async (userId: number) : Promise<ResultSetHeader> => {
    Logger.info(`Deleting user ${userId}'s image in the database`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = null where id = ?';
    const [ result ] = await conn.query( query, [ userId ] );
    await conn.release();
    return result;
};

export {
    updateUserImage,
    deleteUserImage
}