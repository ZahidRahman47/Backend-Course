import express from "express";

const router = express.Router();


//router with http methods for movies
router.get('/', (req, res) => {   
   res.json({ httpMethod: 'GET', message: 'Hello Backend World!'});
}); 

router.post('/', (req, res) => {
   res.json({ httpMethod: 'POST', message: 'Hello Backend World!'});
});

router.put('/', (req, res) => {
   res.json({ httpMethod: 'PUT', message: 'Hello Backend World!'});
});

router.delete('/', (req, res) => {
   res.json({ httpMethod: 'DELETE', message: 'Hello Backend World!'});
}); 

export default router;