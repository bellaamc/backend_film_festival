import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2'
let __SELECTION__ = false;
import { User } from "../models/user.server.model";

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
}
type FilmInfoExtended = {
    /**
     * ID number of the film in the database
     */
    filmId: number;
    /**
     * Title of the film
     */
    title: string;
    /**
     * The description of the film
     */
    description: string;
    /**
     * The id corresponding to the genre.
     */
    genreId: number;
    /**
     * The id of the director, corresponding to the users table.
     */
    directorId: number;
    /**
     * Director's first name
     */
    directorFirstName: string;
    /**
     * The directors last name
     */
    directorLastName: string;
    /**
     * The date the film was released.
     */
    releaseDate: string;
    /**
     * The recommended age rating
     */
    ageRating: string;
    /**
     * The duration of the film
     */
    runtime: number;
    /**
     * Average rating given by reviewers
     */
    rating: number;
    /**
     * The number of ratings made about the film
     */
    numReviews: number;
}

type FilmReview = {
    /**
     * Id of review
     */
    id: number;
    /**
     * ID number of the film in the database
     */
    filmId: number;
    /**
     * The id of user who made review
     */
    user_id: number;
    /**
     * Rating given to film
     */
    rating: number;
    /**
     * The description of review
     */
    review: string;
    /**
     * The date the film was review
     */
    timestamp: string;
}

type Genre = {
    /**
     * Id of the genre
     */
    genreId: number;
    /**
     * Name of the genre
     */
    name:string;
}

enum queryType {
    Q,
    GENRE,
    AGE,
    DIRECTOR,
    REVIEWER,
    LIMIT,
    OFFSET,
    FILMID
}

const viewFilms = async (q: any,
                         genreIds: any,
                         ageRatings: any,
                         directorId: any,
                         reviewerId: any,
                         sortBy: any,
                         limit: any,
                         offset: any) : Promise<FilmInfo[]> => {
    Logger.info(`Viewing films based on search parameters`);
    const conn = await getPool().getConnection();
    const basicQuery = 'SELECT filmId, title, genreId, directorId, directorFirstName, directorLastName, releaseDate, ageRating, rating' +
        ' FROM (select film.id as filmId, film.title as title, film.genre_id as genreId, film.description as description, ' +
        'film.director_id as directorId, film_review.user_id as reviewer_id,' +
        ' user.first_name as directorFirstName, user.last_name as directorLastName, ' +
        'film.release_date as releaseDate, film.age_rating as ageRating, ' +
        'cast(trim(TRAILING \'.\' from (trim(\'.00\' from round(coalesce(avg(rating),0),2))))as float) as rating ' +
        'from film left outer join user on film.director_id = user.id left outer join film_review on film.id = film_review.film_id ' +
        'group by film.id ) as film_ratings';

    const limitQuery = await queryHelperNoWhere(limit, queryType.LIMIT);
    const offsetQuery = await queryHelperNoWhere(offset, queryType.OFFSET);
    const qQuery = await queryHelper(q, queryType.Q);
    const genreQuery = await queryHelper(genreIds, queryType.GENRE);
    const ageQuery = await queryHelper(ageRatings, queryType.AGE);
    const directorQuery = await queryHelper(directorId, queryType.DIRECTOR);
    const reviewerQuery = await queryHelper(reviewerId, queryType.REVIEWER);
    const groupQuery = ` group by film_ratings.filmId`;
    const sortQuery = await sortHelper(sortBy);
    const query = basicQuery + qQuery + genreQuery + ageQuery + directorQuery + reviewerQuery + groupQuery + sortQuery + limitQuery + offsetQuery;
    const [ result ] = await conn.query( query );
    __SELECTION__ = false;
    await conn.release();
    return result;
};

const sortHelper = async (sortBy: string): Promise<string> => {
    let sortQuery: any;
    if (sortBy === "ALPHABETICAL_ASC") {
        sortQuery = " order by film_ratings.title ASC";
    } else if (sortBy === "ALPHABETICAL_DESC") {
        sortQuery = " order by film_ratings.title DESC";
    } else if (sortBy === "RELEASED_ASC") {
        sortQuery = " order by film_ratings.releaseDate ASC";
    } else if (sortBy === "RELEASED_DESC") {
        sortQuery = " order by film_ratings.releaseDate DESC";
    } else if (sortBy === "RATING_ASC") {
        sortQuery = " order by film_ratings.rating ASC ";
    } else if  (sortBy === "RATING_DESC") {
        sortQuery = " order by film_ratings.rating DESC";
    } else {
        sortQuery = " order by film_ratings.releaseDate ASC";
    }
    sortQuery = sortQuery + ", film_ratings.filmId ASC ";
    return sortQuery;
}

const quotationHelper = async (list: string[]): Promise<string[]> => {
    let quotedList: any;
    if (list.length > 1) {
        quotedList = list.map(value => `'${value}'`);
    } else {
        quotedList = [`'${list[0]}'`];
    }
    return quotedList;
}

const queryHelperNoWhere = async (param: any, type: queryType): Promise<string> => {
    let query: any;
    if (param !== undefined) {
        query = await stringDecider(type, param);
    } else {
        query = "";
    }
    return query;
}


const queryHelper = async (param: any, type: queryType): Promise<string> => {
    let midQuery: any;
    let query: any;
    if (param !== undefined) {
        if (!__SELECTION__) {
            query = " where ";
            __SELECTION__ = true;
        } else {
            query = " and ";
        }
        if (type === queryType.AGE) {
            const ageQuotes = await quotationHelper(param);
            midQuery = await stringDecider(type, ageQuotes);
        } else {
            midQuery = await stringDecider(type, param);
        }

        query = query + midQuery;
    } else {
        query = "";
    }
    return query;
}

const stringDecider = async (type:queryType, param: any): Promise<string> => {
    let query: any;
    switch(type) {
        case 0: {
            query = `(film_ratings.title like '%${param}%' or film_ratings.description like '%${param}%')`;
            break;
        }
        case 1: {
            query = `film_ratings.genreId in (${param})`
            break;
        }
        case 2: {
            query = `film_ratings.ageRating in (${param})`;
            break;
        }
        case 3: {
            query = `film_ratings.directorId = ${param}`;
            break;
        }
        case 4: {
            query = `film_ratings.reviewer_id = ${param}`;
            break;
        }
        case 5: {
            query = ` limit ${param}`;
            break;
        }
        case 6: {
            query = ` offset ${param}`;
            break;
        }
        case 7: {
            query = `film.id = ${param}`;
            break;
        }
    }
    return query;
}

const getOneFilm = async (id: number): Promise<FilmInfoExtended[]> => {
    Logger.info(`Viewing a film for a specific id`);
    const conn = await getPool().getConnection();
    const basicQuery = 'select film.id as filmId, film.title as title, film.genre_id as genreId, film.description as description,' +
        ' film.director_id as directorId, film_review.user_id as reviewer_id, user.first_name as directorFirstName, ' +
        'user.last_name as directorLastName, film.release_date as releaseDate, film.age_rating as ageRating, ' +
        'film.runtime as runtime, (select count(*) from film_review where film_id =film.id) as numReviews, ' +
        'cast(trim(TRAILING \'.\' from(trim(\'.00\' from round(coalesce(avg(rating),0),2))))as float) as rating from ' +
    'film left outer join user on film.director_id = user.id left outer join film_review on film.id = film_review.film_id'
    const selectIdQuery = await queryHelper(id, queryType.FILMID);
    const query = basicQuery + selectIdQuery;
    Logger.http(`${query}`);
    const [ result ] = await conn.query( query );
    __SELECTION__ = false;
    await conn.release();
    return result;
}


const checkIdInTable = async (id:number): Promise<boolean> => {
    Logger.info(`Checking  if film matches id ${id} in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ?';
    const [ output ] = await conn.query( query, [ id ] );
    await conn.release();
    let result: any;
    if (output.length !== 0) {
        result = true;
    } else {
        result = false;
    }
    return result;
}

const getGenreInfo = async (): Promise<Genre[]> => {
    Logger.info(`Getting information about the genres in the database`);
    const conn = await getPool().getConnection();
    const query = 'select distinct genre.id as genreId, genre.name from genre inner join film on genre.id = film.genre_id';
    const [ result ] = await conn.query( query );
    await conn.release();
    return result;
}

const checkGenreExists = async (genreId: number): Promise<Genre[]> => {
    Logger.info(`Checking genre exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from genre where id = ?';
    const [ result ] = await conn.query( query, [ genreId ] );
    await conn.release();
    return result;
}

const checkTitleExists = async (title: string): Promise<FilmInfo[]> => {
    Logger.info(`Checking genre exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where title = ?';
    const [ result ] = await conn.query( query, [ title ] );
    await conn.release();
    return result;
}

const postAFilm = async (title: string, description: string, genreId: number, runtime: number, ageRating: string, releaseDate: string, directorId: number): Promise<ResultSetHeader> => {
    Logger.info(`Inserting film ${title} into the database`);
    const conn = await getPool().getConnection();
    const query = 'insert into film (title, description, genre_id, runtime, age_rating, release_date, director_id) values (?, ?, ?, ?, ?, ?, ?)';
    const [ result ] = await conn.query( query, [ title, description, genreId, runtime, ageRating, releaseDate, directorId ] );
    Logger.http(`${query}`);
    await conn.release();
    return result;
}

const findUserWithAuthToken = async (authToken: string): Promise<User[]> => {
    Logger.info(`Checking genre exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from user where auth_token = ?';
    const [ result ] = await conn.query( query, [ authToken ] );
    await conn.release();
    return result;
}

const getFilmFromId = async (id: number): Promise<FilmInfo[]> => {
    Logger.info(`Checking genre exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
}

const getReviewFromFilmId = async (id: number): Promise<FilmReview[]> => {
    Logger.info(`Checking genre exists in the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from film_review where film_id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
}

const updateTitle = async (id: number, title: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating title for a film ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update film set title = ? where id = ?';
    const [ result ] = await conn.query( query, [ title, id ] );
    await conn.release();
    return result;
}

const updateDescription = async (id: number, description: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating description for a film ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update film set description = ? where id = ?';
    const [ result ] = await conn.query( query, [ description, id ] );
    await conn.release();
    return result;
}

const updateReleaseDate = async (id: number, releaseDate: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating release date for a film ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update film set release_date = ? where id = ?';
    const [ result ] = await conn.query( query, [ releaseDate, id ] );
    await conn.release();
    return result;
}

const updateRuntime = async (id: number, runtime: number): Promise<ResultSetHeader> => {
    Logger.info(`Updating runtime for a film ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update film set runtime = ? where id = ?';
    const [ result ] = await conn.query( query, [ runtime, id ] );
    await conn.release();
    return result;
}

const updateAgeRating = async (id: number, ageRating: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating age rating for a film ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update film set age_rating = ? where id = ?';
    const [ result ] = await conn.query( query, [ ageRating, id ] );
    await conn.release();
    return result;
}

const updateGenreId = async (id: number, genreId: number): Promise<ResultSetHeader> => {
    Logger.info(`Updating age rating for a film ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update film set genre_id = ? where id = ?';
    const [ result ] = await conn.query( query, [ genreId, id ] );
    await conn.release();
    return result;
}

const getFilmIdKey = async (id: number) : Promise<FilmInfo[]> => {
    Logger.info(`Getting film ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from film where id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
};

const getFilmImage = async (id: number) : Promise<image[]> => {
    Logger.info(`Getting film ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = 'select image_filename from film where id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
};

type image = {
    filename: string;
}

const deleteReview = async (id: number) : Promise<ResultSetHeader> => {
    Logger.info(`Getting film ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = 'delete from film_review where film_id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
};

const deleteFilm = async (id: number) : Promise<ResultSetHeader> => {
    Logger.info(`Getting film ${id} from the database`);
    const conn = await getPool().getConnection();
    const query = 'delete from film where id = ?';
    const [ result ] = await conn.query( query, [ id ] );
    await conn.release();
    return result;
};

const getGenreInDB = async (genres: any) : Promise<boolean> => {
    Logger.info(`Checking genres are in the db`);
    const conn = await getPool().getConnection();
    const query = 'select id from genre';
    const [ result ] = await conn.query( query );
    await conn.release();
    if (Array.isArray(genres)) {
        return genres.every((genre:any) => result.some((obj:any) => obj.id === parseInt(genre, 10)));
    }
    return result.some((obj: any) => obj.id === parseInt(genres, 10));
};

export {
    viewFilms,
    getOneFilm,
    checkIdInTable,
    getGenreInfo,
    checkGenreExists,
    checkTitleExists,
    postAFilm,
    findUserWithAuthToken,
    getFilmFromId,
    getReviewFromFilmId,
    updateTitle,
    updateDescription,
    updateRuntime,
    updateAgeRating,
    updateReleaseDate,
    updateGenreId,
    getFilmIdKey,
    deleteReview,
    deleteFilm,
    getFilmImage,
    getGenreInDB
}