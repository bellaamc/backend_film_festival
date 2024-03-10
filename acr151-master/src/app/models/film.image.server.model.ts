import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'

type FilmInfo = {
    /**
     * ID number of the film in the database
     */
    id: number;
    /**
     * Title of the film
     */
    title: string;
    /**
     * The id corresponding to the genre.
     */
    genre_id: number;
    /**
     * The id of the director, corresponding to the users table.
     */
    director_id: number;
    /**
     * Director's first name
     */
    first_name: string;
    /**
     * The directors last name
     */
    last_name: string;
    /**
     * The recommended age rating
     */
    age_rating: string;
    /**
     * Average rating given by reviewers
     */
    rating: number;
    /**
     * The date the film was released.
     */
    release_date: string;
    /**
     * image file
     */
    image_filename: string;
}

const getFilmIdKey = async (id: number) : Promise<FilmInfo[]> => {
    Logger.info(`Getting film ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
};

export {
    getFilmIdKey
}