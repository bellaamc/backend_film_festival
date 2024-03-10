import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as schemas from '../resources/schemas.json';
import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});
import {validate} from '../../app/validation/validator';
import * as users from "../models/film.server.model";
import {start} from "repl";
import {
    checkGenreExists,
    checkIdInTable,
    checkTitleExists, deleteFilm, deleteReview,
    findUserWithAuthToken,
    getFilmIdKey, getFilmImage, getGenreInDB
} from "../models/film.server.model";
import * as bcrypt from "bcryptjs";
import {getUserIdKey} from "../models/user.server.model";
import path from "path";
import fs from "mz/fs";

const viewAll = async (req: Request, res: Response): Promise<void> => {
    try{
        Logger.http('Viewing all films');
        const validation = await validate(
            schemas.film_search,
            req.query);
        if (validation !== true) {
            res.statusMessage = `Bad Request`;
            res.status(400).send();
            return;
        }
        const starting = req.query.start;
        let startIndex: any;
        const counting = req.query.count;
        let count: any;
        const q = req.query.q;
        const genreIds = req.query.genreIds;
        const ageRatings = req.query.ageRatings;
        const directorId = req.query.directorId;
        const reviewerId = req.query.reviewerId;
        const sortBy = req.query.sortBy;
        if (genreIds !== undefined) {
            const genreInDb = await getGenreInDB(genreIds);
            if (!genreInDb) {
                res.statusMessage = "Bad Request";
                res.status(400).send();
                return;
            }
        }
        if (starting !== undefined) {
            startIndex =  Number(starting)
        } else {
            startIndex = undefined;
        }
        if (counting === undefined) {
            if (startIndex === undefined) {
                count = undefined;
            } else {
                count = "all";
            }
        } else {
            count = Number(counting);
        }
        const totalFilms = await users.viewFilms(q, genreIds, ageRatings, directorId, reviewerId, sortBy, undefined, undefined);
        let numFilms:any;
        numFilms = totalFilms.length;
        const films = await users.viewFilms(q, genreIds, ageRatings, directorId, reviewerId, sortBy, count, startIndex);
        Logger.http(`${numFilms}`);
        res.statusMessage = "OK";
        res.status(200).send({"films":films, "count": numFilms});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.film_search,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request`;
            res.status(400).send();
            return;
        }
        const id = req.params.id;
        const idInTable = await checkIdInTable(Number(id));
        if (!idInTable) {
            res.statusMessage = "Not Found. No film with id";
            res.status(404).send();
            return;
        }
        const film = (await users.getOneFilm(Number(id)))[0];
        res.statusMessage = "OK";
        res.status(200).send({"filmId":film.filmId, "title": film.title, "description":film.description, "genreId": film.genreId,
        "directorId": film.directorId, "directorFirstName": film.directorFirstName, "directorLastName": film.directorLastName, "releaseDate": film.releaseDate,
        "ageRating":film.ageRating, "runtime": film.runtime, "rating": film.rating, "numReviews": film.numReviews});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.film_post,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request`;
            res.status(400).send();
            return;
        }
        const title = req.body.title;
        const description = req.body.description;
        let releaseDate = req.body.releaseDate;
        const checkReleaseDate = new Date(releaseDate).getTime();
        const today = new Date().getTime();
        const genreId = req.body.genreId;
        let runtime = req.body.runtime;
        let ageRating = req.body.ageRating;
        const genreExists = await checkGenreExists(genreId);
        const titleExists = await checkTitleExists(title);
        if (genreExists.length === 0) {
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        if (releaseDate === undefined) {
            const date = new Date();
            const isoString = date.toISOString();
            releaseDate = isoString.slice(0, 19).replace('T', ' ');
        }
        if (titleExists.length !== 0 || checkReleaseDate < today) {
            res.statusMessage = "Forbidden. Film title is not unique, or cannot release a film in the past";
            res.status(403).send();
            return;
        }
        if (runtime === undefined) {
            runtime = null;
        }
        if (ageRating === undefined) {
            ageRating = 'TBC';
        }
        const token = req.header("X-Authorization");
        const director = await users.findUserWithAuthToken(token);
        if (token === null || director.length === 0) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const result = await users.postAFilm(title, description, genreId, runtime, ageRating, releaseDate, director[0].id);
        res.statusMessage = "Created";
        res.status(201).send({"filmId": result.insertId});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const editOne = async (req: Request, res: Response): Promise<void> => {
    try{
        try {
            const validation = await validate(
                schemas.film_patch,
                req.body);
            if (validation !== true) {
                res.statusMessage = `Bad Request`;
                res.status(400).send();
                return;
            }
            const id = req.params.id;
            const title = req.body.title;
            const description = req.body.description;
            const runtime = req.body.runtime;
            const genreId = req.body.genreId;
            const ageRating = req.body.ageRating;
            const releaseDate = req.body.releaseDate;
            const token = req.header("X-Authorization");
            if (token === undefined) {
                res.statusMessage = "Unauthorized";
                res.status(401).send();
                return;
            }
            const today = new Date().getTime();
            const film = await users.getFilmFromId(Number(id));
            const currentRelease = new Date(film[0].release_date).getTime();
            if (film.length === 0) {
                res.statusMessage = "Not Found. No film found with id";
                res.status(404).send();
                return;
            }
            const director = await users.findUserWithAuthToken(token);
            const reviews = await users.getReviewFromFilmId(film[0].id);
            if (director.length === 0) {
                res.statusMessage = "Forbidden. Only the director of an film may change it, cannot change the releaseDate since " +
                    "it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                res.status(403).send();
                return;
            }
            if (currentRelease < today || film[0].director_id !== director[0].id || reviews.length !== 0) {
                res.statusMessage = "Forbidden. Only the director of an film may change it, cannot change the releaseDate since " +
                    "it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                res.status(403).send();
                return;
            }
            const idNum = Number(id);
            if (title !== undefined) {
                const result = await users.updateTitle(idNum, title);
            }
            if (description !== undefined) {
                const result = await users.updateDescription(idNum, description);
            }
            if (releaseDate !== undefined) {
                const checkReleaseDate = new Date(releaseDate).getTime();
                if (checkReleaseDate < today) {
                    res.statusMessage = "Forbidden. Only the director of an film may change it, cannot change the releaseDate since " +
                        "it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past";
                    res.status(403).send();
                    return;
                }
                const result = await users.updateReleaseDate(idNum, releaseDate);
            }
            if (runtime !== undefined) {
                const result = await users.updateRuntime(idNum, runtime);
            }
            if (ageRating !== undefined) {
                const result = await users.updateAgeRating(idNum, ageRating);
            }
            if (genreId !== undefined) {
                const genreExists = await checkGenreExists(genreId);
                if (genreExists.length === 0) {
                    res.statusMessage = "Bad Request";
                    res.status(400).send();
                    return;
                }
                const result = await users.updateGenreId(idNum, genreId);
            }
            res.statusMessage = "OK";
            res.status(200).send();
            return;
        } catch (err) {
            res.statusMessage = "Not Found. No user with specified ID";
            res.status(404).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        const token = req.header("X-Authorization");
        if (token === undefined) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const film = await getFilmIdKey(Number(id));
        const director = await findUserWithAuthToken(token);
        if (film.length === 0) {
            res.statusMessage = "Not Found. No film found with id";
            res.status(404).send();
            return;
        }
        if (director.length === 0)  {
            res.statusMessage = "Forbidden. Only the director of an film can delete it";
            res.status(403).send();
            return;
        }
        if (director[0].id !== film[0].director_id) {
            res.statusMessage = "Forbidden. Only the director of an film can delete it";
            res.status(403).send();
            return;
        }
        const image = (await getFilmImage(Number(id)))[0].filename;
        if (image !== undefined) {
            const oldStoragePath = path.join(__dirname, '../../../storage/images');
            const oldImagePath = path.join(oldStoragePath, image);
            await fs.unlink(oldImagePath);
        }
        const reviewDelete = await deleteReview(Number(id));
        const filmDelete = await deleteFilm(Number(id));
        res.statusMessage = "OK";
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getGenres = async (req: Request, res: Response): Promise<void> => {
    try{
        const genres = await users.getGenreInfo();
        res.statusMessage = "OK";
        res.status(200).send(genres);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {viewAll, getOne, addOne, editOne, deleteOne, getGenres};