import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'

type FilmReview = {
    /**
     * Id of reviewer
     */
    reviewerId: number;
    /**
     * Rating
     */
    rating: number;
    /**
     * The review description
     */
    review: string;
    /**
     * first name of reviewer
     */
    reviewerFirstName: string;
    /**
     * The last name of the reviewer
     */
    reviewerLastName: string;
    /**
     * date and time the review was made
     */
    timestamp: string;
}
const getReviews = async (id: number) : Promise<FilmReview[]> => {
    Logger.info(`Getting film ${id} reviews from the database`);
    const conn = await getPool().getConnection();
    const query = 'select user_id as reviewerId, rating, review, first_name as reviewerFirstName, last_name as reviewerLastName, timestamp \n' +
        `from film_review left outer join user on film_review.user_id = user.id where film_id = ${id} order by timestamp desc`;
    const [ result ] = await conn.query( query );
    await conn.release();
    return result;
};

const addReview = async (filmId: number, userId: number, rating: number, review: string, timestamp:string) : Promise<FilmReview[]> => {
    Logger.info(`Putting film review for ${filmId} from the database`);
    const conn = await getPool().getConnection();
    const query = 'insert into film_review (film_id, user_id, rating, review, timestamp) values (?,?,?,?,?)';
    const [ result ] = await conn.query( query, [filmId,userId, rating, review, timestamp] );
    await conn.release();
    return result;
};

export {
    getReviews,
    addReview
}
