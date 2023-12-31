const express = require('express');
const router = express.Router();
const Application = require('../../models/admission/application');
const ScreeningRule = require('../../models/admission/screening/screening-rules');


router.get('/graph', async (req, res) => {

    const application = await Application.find({})

    const enabled_rules = await ScreeningRule.find({ criteria: { $exists: true, $not: { $size: 0 } } });

    screened_application = [];

    await Promise.all(enabled_rules.map(async (rule) => {
        const _appliactions = await Application.find({ ...rule.criteria, current_class: rule.class });
        screened_application = screened_application.concat(_appliactions);
    }));

    res.json({
        application: application.length,
        screened: screened_application.length,
    })

})

router.post('/create-rules', async (req, res) => {


    const classes = req.body.classes;

    await ScreeningRule.deleteMany({});

    classes.map(async (cl) => {
        await new ScreeningRule({
            class: cl,
            active: false,
            criteria: {}
        }).save();
    })

    res.json(await ScreeningRule.find({}));
})

router.put('/screening-rules', async (req, res) => {

    try {

        const query = req.body;
        const filter = {}

        query.criteria?.map((cr, idx) => {
            console.log(cr.operator)

            switch (cr.operator) {

                case 'eq':
                    filter[cr.field] = cr.value.split('__')
                    break;

                case 'lt':
                    filter[cr.field] = { $lt: cr.value }
                    break;

                case 'gt':
                    filter[cr.field] = { $gt: cr.value }
                    break;

                case 'lte':
                    filter[cr.field] = { $lte: cr.value }
                    break;

                case 'gte':
                    filter[cr.field] = { $gte: cr.value }
                    break;

                case 'range':
                    filter[cr.field] = {
                        $gte: new Date(new Date(cr.min).setHours(0, 0, 0)),
                        $lt: new Date(new Date(cr.max).setHours(23, 59, 59))
                    }
                    break;

                default:
                    filter[cr.field] = cr.value
                    break;

            }
        })


        const screened = await ScreeningRule.updateOne({
            class: req.body.class
        }, {
            active: req.body.active,
            formated_criteria: query.criteria,
            criteria: filter
        })

        res.json({
            formated_criteria: query.criteria,
            query: {
                current_class: query.class,
                ...filter
            }
        })
    }
    catch (err) {
        res.status(400).json({
            message: "Internal Error",
            err: err
        })
    }

})

router.get("/get-rules", async (req, res) => {
    try {
        const rules = await ScreeningRule.find({}, '-criteria -__v -_id');
        res.json(rules)
    }
    catch (err) { res.status(401).send(err) }

})

router.get("/get-rules/enabled", (req, res) => {
    ScreeningRule.find({ criteria: { $exists: true, $not: { $size: 0 } } }, '-criteria -__v -_id').then(r => {
        res.json(r);
    }).catch(
        err => { res.status(401).send(err) }
    )
})

router.get("/get-rules/disabled", (req, res) => {
    ScreeningRule.find({ criteria: { $exists: true, $size: 0 } }, '-criteria -__v -_id').then(r => {
        res.json(r);
    }).catch(
        err => { res.status(401).send(err) }
    )
})

router.get("/screened-applications", async (req, res) => {

    const enabled_rules = await ScreeningRule.find({ criteria: { $exists: true, $not: { $size: 0 } } });
    screened_application = [];

    await Promise.all(enabled_rules.map(async (rule) => {
        const _appliactions = await Application.find({ ...rule.criteria, current_class: rule.class });
        screened_application = screened_application.concat(_appliactions);
    }));

    res.json(screened_application);
})
module.exports = router;