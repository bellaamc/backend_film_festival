import {Request, Response} from "express";
import Logger from "../../config/logger";
import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});
import {getUserIdKey} from "../../app/models/user.server.model";
import * as users from '../../app/models/user.image.server.model';
import path from "path";
import fs from "mz/fs";
import {validate} from "../validation/validator";
import * as schemas from "../resources/schemas.json";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        Logger.http(`GET user ${req.params.id}'s image`);
        const id = req.params.id;
        const userList = await getUserIdKey(parseInt(id,10));
        if (userList.length === 0 || userList[0].image_filename == null) {
            res.statusMessage = "Not Found. No user with specified ID, or user has no image";
            res.status(404).send();
            return;
        } else {
            const storagePath = path.join(__dirname, '../../../storage/images');
            const imagePath = path.join(storagePath, userList[0].image_filename);
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
        const token = req.header("X-Authorization");
        const id = req.params.id;
        const image = req.body;
        const userList = await getUserIdKey(parseInt(id,10));
        if (token === undefined || token == null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        } else if (userList.length === 0) {
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        } else if (userList[0].auth_token !== token) {
            res.statusMessage = "Forbidden. Can not change another user's profile photo";
            res.status(403).send();
            return;
        }
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
        const filename = `user_${userList[0].id}${ext}`;
        const storagePath = path.join(__dirname, '../../../storage/images');
        const imagePath = path.join(storagePath, filename);
        if (userList[0].image_filename === null) {
            await fs.writeFile(imagePath, image);
            const result = await users.updateUserImage(filename, userList[0].id);
            res.statusMessage = "Created. New image created";
            res.status(201).send();
            return ;
        } else {
            const oldFilename = userList[0].image_filename;
            const oldStoragePath = path.join(__dirname, '../../../storage/images');
            const oldImagePath = path.join(oldStoragePath, oldFilename);
            await fs.unlink(oldImagePath);
            await fs.writeFile(imagePath, image);
            const result = await users.updateUserImage(filename, userList[0].id);
            res.statusMessage = "OK. Image updated";
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


const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try{
        Logger.http(`DELETE user ${req.params.id}'s image`);
        const id = req.params.id;
        const userList = await getUserIdKey(parseInt(id,10));
        const token = req.header("X-Authorization");
        if (token == null) {
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        } else if (userList[0].auth_token !== token) {
            res.statusMessage = "Forbidden. Can not delete another user's profile photo";
            res.status(403).send();
            return;
        }
        if (userList.length === 0) {
            res.statusMessage = "Not Found. No such user with ID given";
            res.status(404).send();
            return;
        } else if (userList[0].image_filename === null) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }
        const result = await users.deleteUserImage(userList[0].id);
        const filename = userList[0].image_filename;
        const storagePath = path.join(__dirname, '../../../storage/images');
        const imagePath = path.join(storagePath, filename);
        await fs.unlink(imagePath);
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

export {getImage, setImage, deleteImage}