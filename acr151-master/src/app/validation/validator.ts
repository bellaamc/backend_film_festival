import Ajv from 'ajv';

const ajv = new Ajv({removeAdditional: 'all', strict:false});
ajv.addFormat('email', (data) => {
    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailPattern.test(data);
});

ajv.addFormat('password', (value: string) => {
    return value.length>= 6;
});

ajv.addFormat('integer', (data) => {
    const integerPattern = /^[0-9]+$/;
    return integerPattern.test(data);
});

ajv.addFormat('datetime', (data) => {
    const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    return datePattern.test(data);
});

ajv.addFormat('name', (data) => {
    const namePattern = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;
    return namePattern.test(data);
});

const validate = async (schema: object, data: any) => {
    try {
        const validator = ajv.compile(schema);
        const valid = await validator(data);
        if(!valid)
            return ajv.errorsText(validator.errors);
        return true;
    } catch (err) {
        return err.message;
    }
}

export {validate}