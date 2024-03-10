import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from '../../app/models/user.server.model';
import * as schemas from '../resources/schemas.json';
import Ajv from 'ajv';
const ajv = new Ajv({removeAdditional: 'all', strict: false});
import {validate} from '../../app/validation/validator';
import * as bcrypt from 'bcryptjs';
import { uid } from 'rand-token';
import {compare} from "bcryptjs";
import {getUserIdKey} from "../../app/models/user.server.model";
import {findUserWithAuthToken} from "../models/film.server.model";
const register = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST new user onto system`)
    const validation = await validate(
        schemas.user_register,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request. Invalid Information`;
        res.status(400).send();
        return;
    }
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password,10);
    try{
        const result = await users.getUserEmailKey(email);
        if (result.length !== 0) {
            res.statusMessage = "Forbidden. Email already in use";
            res.status(403).send();
        } else {
            const finalResult = await users.insertNewUser(email, firstName, lastName, hashedPassword);
            res.statusMessage = `Created`;
            // check what insertId is
            res.status(201).send({"userId": finalResult.insertId});
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST new login into the system`)
    const validation = await validate(
        schemas.user_login,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request. Invalid Information.`;
        res.status(400).send();
        return;
    }
    const email = req.body.email;
    const password = req.body.password;
    try{
        const newUser = await users.getUserEmailKey(email);
        if (newUser.length === 0) {
            res.statusMessage = `Not Authorised. Incorrect email/password`;
            res.status(401).send();
        } else {
            const hashedPassword = newUser[0].password;
            const correctPassword = await compare(password, hashedPassword);
            const token = uid(12);

            if (!correctPassword) {
                res.statusMessage = `Not Authorised. Incorrect email/password`;
                res.status(401).send();
            } else {
                const finalResult = await users.updateSuccessfulLogin(email, token);
                res.statusMessage = `OK`;
                res.status(200).send({"userId": newUser[0].id, "token": token});
            }
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST new logout of the system`)
    try{
        const token = req.header("X-Authorization");
        if (token == null) {
            res.statusMessage = "Unauthorized. Cannot log out if you are not authenticated";
            res.status(401).send();
            return;
        } else {
            const stringToken = token.toString();
            const loggingOut = await findUserWithAuthToken(stringToken);
            const loggedOut = await users.logUserOut(stringToken);
            if (loggingOut.length === 0) {
                res.statusMessage = "Unauthorized. Cannot log out if you are not authenticated";
                res.status(401).send();
                return;
            }
            res.statusMessage = "OK";
            res.status(200).send();
            return;
        }
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    Logger.http('Get information about a user based on their user id')

    try{
        try {
            const userId = req.params.id;
            const numberId = parseInt(userId, 10);
            const userList = await users.getUserIdKey(numberId);
            if (userList.length === 0) {
                res.statusMessage = "Not Found. No user with specified ID";
                res.status(404).send();
                return;
            }
            const token = req.header("X-Authorization");
            const user = (await users.getUserIdKey(numberId))[0];
            if (token == null) {
                res.statusMessage = "OK"
                res.status(200).send({"firstName": user.first_name,
                    "lastName": user.last_name});
                return;
            }
            const stringToken = token.toString();
            if (stringToken !== user.auth_token) {
                res.statusMessage = "OK"
                res.status(200).send({"firstName": user.first_name,
                    "lastName": user.last_name});
                return;
            } else {
                res.statusMessage = "OK"
                res.status(200).send({"email":user.email, "firstName": user.first_name,
                    "lastName": user.last_name});
                return;
            }
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


const update = async (req: Request, res: Response): Promise<void> => {
    Logger.http('Updating user password');
    const validation = await validate(
        schemas.user_edit,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request. Invalid Information.`;
        res.status(400).send();
        return;
    }
    try {
        const userId = req.params.id;
        const email = req.body.email;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const password = req.body.password;
        const currentPassword = req.body.currentPassword;
        const token = req.header("X-Authorization");
        if (token === undefined || token == null) {
            res.statusMessage = "Unauthorized or Invalid currentPassword";
            res.status(401).send();
            return;
        }
        const usersList = await getUserIdKey(parseInt(userId, 10));
        if (usersList.length === 0) {
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }
        const userToken = usersList[0].auth_token
        if (userToken !== token) {
            res.statusMessage = "Forbidden. This is not your account, or the email is already in use, " +
                "or identical current and new passwords";
            res.status(403).send();
            return;
        }
        if (email !== undefined) {
            const checkingForUser = await users.getUserEmailKey(email);
            if (checkingForUser.length !== 0) {
                res.statusMessage = "Forbidden. This is not your account, or the email is already in use, " +
                    "or identical current and new passwords"
                res.status(403).send();
                return;
            }
        }
        if (password !== undefined) {
            const oldPassword = usersList[0].password;
            const correctPassword = await compare(currentPassword, oldPassword);
            if (!correctPassword) {
                res.statusMessage = "Unauthorized or Invalid currentPassword";
                res.status(401).send();
                return;
            } else if (password === currentPassword) {
                res.statusMessage = "Forbidden. This is not your account, or the email " +
                    "is already in use, or identical current and new passwords";
                res.status(403).send();
                return;
            }
        }
        const idNum = parseInt(userId,10);
        if (email !== undefined) {
            const result = await users.updateEmail(idNum,email);
        }
        if (firstName !== undefined) {
            const result = await users.updateFirstName(idNum, firstName);
        }
        if (lastName !== undefined) {
            const result = await users.updateLastName(idNum, lastName);
        }
        if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password,10);
            const result = await users.updatePassword(idNum, hashedPassword);
        }
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


export {register, login, logout, view, update}