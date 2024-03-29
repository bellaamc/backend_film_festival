import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'

type User = {
    /**
     * User id generated by database
     */
    id: number,
    /**
     * User email as entered when created
     */
    email: string,
    /**
     * Users first name as entered when created
     */
    first_name: string
    /**
     * Users last name as entered when created
     */
    last_name: string
    /**
     * User's image attached to their profile
     */
    image_filename:string
    /**
     * Users password as entered when created
     */
    password: string
    /**
     * Token generated by a successful login
     */
    auth_token: string
}

const getUserEmailKey = async (email: string) : Promise<User[]> => {
    Logger.info(`Getting user ${email} from the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where email = ?';
    const [ result ] = await conn.query( query, [ email ] );
    await conn.release();
    return result;
};

const insertNewUser = async (email: string, firstName: string, lastName: string, password: string) : Promise<ResultSetHeader> => {
    Logger.info(`Inserting user ${email} into the database`);
    const conn = await getPool().getConnection();
    const query = 'insert into user (email, first_name, last_name, password) values (?, ?, ?, ?)';
    const [ result ] = await conn.query( query, [ email, firstName, lastName, password ] );
    await conn.release();
    return result;
};

const updateSuccessfulLogin = async (email: string, token: string) : Promise<ResultSetHeader> => {
    Logger.info('Logging in a user and inserting a token into the database');
    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = ? where email = ?';
    const [ result ] = await conn.query( query, [ token, email ] );
    await conn.release();
    return result;
}

const logUserOut = async (token: string) : Promise<ResultSetHeader> => {
    Logger.info('Logging a User out of the database');
    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = null where auth_token = ?';
    const [ result ] = await conn.query( query, [ token ] );
    await conn.release();
    return result;
}

const getUserIdKey = async (id: number) : Promise<User[]> => {
    Logger.info('Getting info about a user with id key')
    const conn = await getPool().getConnection();
    const query = 'select * from user where id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
}

const updateEmail = async (id: number, email: string) : Promise<ResultSetHeader> => {
    Logger.info('Updating field for an authorised user')
    const conn = await getPool().getConnection();
    const query = 'update user set email = ? where id = ?';
    const [ result ] = await conn.query( query, [ email, id ] );
    await conn.release();
    return result;
}

const updatePassword = async (id: number, password: string) : Promise<ResultSetHeader> => {
    Logger.info('Updating field for an authorised user')
    const conn = await getPool().getConnection();
    const query = 'update user set password = ? where id = ?';
    const [ result ] = await conn.query( query, [ password, id ] );
    await conn.release();
    return result;
}

const updateFirstName = async (id: number, firstname: string) : Promise<ResultSetHeader> => {
    Logger.info('Updating field for an authorised user')
    const conn = await getPool().getConnection();
    const query = 'update user set first_name = ? where id = ?';
    const [result] = await conn.query(query, [firstname, id]);
    await conn.release();
    return result;
}
const updateLastName = async (id: number, lastname: string) : Promise<ResultSetHeader> => {
    Logger.info('Updating field for an authorised user')
    const conn = await getPool().getConnection();
    const query = 'update user set last_name = ? where id = ?';
    const [ result ] = await conn.query( query, [ lastname, id ] );
    await conn.release();
    return result;
}

export {
    getUserEmailKey,
    insertNewUser,
    updateSuccessfulLogin,
    logUserOut,
    getUserIdKey,
    updateEmail,
    updatePassword,
    updateFirstName,
    updateLastName,
    User
}