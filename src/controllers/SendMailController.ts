import { Request, Response } from "express";
import { getCustomRepository } from "typeorm";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import SendMailService from "../services/SendMailService";
import { resolve } from "path"
import { AppError } from "../errors/AppError";

class SendMailController {
    
    async execute(request: Request, response: Response){
        const { email, survey_id } = request.body;

        const usersRepository = getCustomRepository(UsersRepository);
        const surveyRepository = getCustomRepository(SurveysRepository);
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

        const user = await usersRepository.findOne({email});

        if(!user){
            throw new AppError("User does not exist!")
        }

        const survey = await surveyRepository.findOne({id: survey_id})

        if(!survey){
            throw new AppError("Survey does not exist!")
        }

        const npsPath = resolve(__dirname, "..","views","emails","npsMail.hbs")

        const surveyUserAlreadyExist = await surveysUsersRepository.findOne({
            where: {user_id: user.id, value: null},
            relations: ["user","surveys"]
        })

        const variables = {
            name: user.name,
            title: survey.title,
            description: survey.description,
            id: "",
            link: process.env.URL_MAIL
        }

        if(surveyUserAlreadyExist){
            variables.id = surveyUserAlreadyExist.id
            await   SendMailService.execute(email, survey.title, variables, npsPath);
            return response.json(surveyUserAlreadyExist)
        }

        const surveyUser = surveysUsersRepository.create({
            user_id: user.id,
            survey_id
        })

        await surveysUsersRepository.save(surveyUser);

        variables.id = surveyUser.id

        await SendMailService.execute(email, survey.title, variables, npsPath);

        return response.json(surveyUser);
    }
}

export { SendMailController }