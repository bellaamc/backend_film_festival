import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as reviews from '../models/film.review.server.model'
import {getFilmFromId, getFilmIdKey} from '../models/film.server.model'
import {getUserIdKey} from "../models/user.server.model";
import {findUserWithAuthToken} from "../models/film.server.model";
import {validate} from "../validation/validator";
import * as schemas from "../resources/schemas.json";
const getReviews = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = req.params.id;
        const films = await getFilmFromId(Number(id));
        const filmReview = await reviews.getReviews(Number(id));
        if (films.length === 0) {
            res.statusMessage = "Not Found. No film found with id";
            res.status(404).send();
            return;
        }
        res.statusMessage = "OK";
        res.status(200).json(filmReview);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const addReview = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.film_review_post,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request. Invalid Information.`;
            res.status(400).send();
            return;
        }
        const id = req.params.id;
        const rating = req.body.rating;
        const review = req.body.review;
        const film = await getFilmIdKey(Number(id));
        const released = new Date(film[0].release_date).getTime();
        const today = new Date().getTime();
        if (film.length === 0) {
            res.statusMessage = "Not Found. No film found with id";
            res.status(404).send();
            return;
        }
        const user = await getUserIdKey(film[0].director_id);
        const token = req.header("X-Authorization");
        if (token === undefined) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
        const reviewer = await findUserWithAuthToken(token);
        if (token === user[0].auth_token || released > today) {
            res.statusMessage = "Forbidden. Cannot review your own film, or cannot post a review on a film that has not yet released";
            res.status(404).send();
            return;
        }
        const date = new Date();
        const isoString = date.toISOString();
        const timestamp = isoString.slice(0, 19).replace('T', ' ');
        const postReview = await reviews.addReview(Number(id), reviewer[0].id, rating, review, timestamp);
        res.statusMessage = "Created";
        res.status(201).send();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}



export {getReviews, addReview}