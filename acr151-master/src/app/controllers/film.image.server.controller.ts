import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as images from '../models/film.image.server.model'
import path from "path";
import {getUserIdKey} from "../models/user.server.model";
import fs from "mz/fs";
import * as users from "../models/user.image.server.model";

const getImage = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET image name for user id: ${req.params.id}`)
    try{
        const id = req.params.id;
        const films = await images.getFilmIdKey(Number(id));
        if (films.length === 0 || films[0].image_filename == null) {
            res.statusMessage = "Not found. No film found with id, or film has no image";
            res.status(404).send();
            return;
        } else {
            const storagePath = path.join(__dirname, '../../../storage/images');
            const imagePath = path.join(storagePath, films[0].image_filename);
            res.statusMessage = "OK";
            res.status(200).sendFile(imagePath);
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        Logger.http(`PUT user ${req.params.id}'s image`);
        const imgExtension = req.header(`Content-Type`);
        let ext = "";
        if (imgExtension === "image/jpeg" || imgExtension === "image/jpg") {
            ext = ".jpeg";
        } else if (imgExtension === "image/png") {
            ext = ".png";
        } else if (imgExtension === "image/gif") {
            ext = ".gif";
        } else {
            res.statusMessage = "Bad Request. Invalid image supplied (possibly incorrect file type)";
            res.status(400).send();
            return;
        }
        const id = req.params.id;
        const currentImage = (await images.getFilmIdKey(Number(id)))[0].image_filename;
        const image = req.body;
        const films = await images.getFilmIdKey(Number(id));
        if (films.length === 0) {
            res.statusMessage = "Not Found. No film found with id";
            res.status(404).send();
            return;
        }
        const token = req.header("X-Authorization");
        const director = await getUserIdKey(films[0].director_id);
        if (token === null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        } else if (director[0].auth_token !== token) {
            res.statusMessage = "Forbidden. Only the director of a film can change the hero image";
            res.status(403).send();
            return;
        }
        const filename = `film_${films[0].id}${ext}`;
        const storagePath = path.join(__dirname, '../../../storage/images');
        const imagePath = path.join(storagePath, filename);
        if (films[0].image_filename === null) {
            await fs.writeFile(imagePath, image);
            const result = await users.updateUserImage(filename, films[0].id);
            res.statusMessage = "Created";
            res.status(201).send();
            return ;
        } else {
            const oldFilename = currentImage;
            const oldStoragePath = path.join(__dirname, '../../../storage/images');
            const oldImagePath = path.join(oldStoragePath, oldFilename);
            await fs.unlink(oldImagePath);
            await fs.writeFile(imagePath, image);
            const result = await users.updateUserImage(filename, films[0].id);
            res.statusMessage = "OK";
            res.status(200).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage};