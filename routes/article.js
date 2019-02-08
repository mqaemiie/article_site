const path = require('path'); 

const express = require('express'); //ok

const { body,validationResult } = require('express-validator/check');

const articleController = require('../controllers/article'); //ok
const isAuth = require('../middleware/is-auth'); 

const router = express.Router(); //ok

router.get('/', articleController.getArticles);

router.get('/add-article', isAuth, articleController.getAddArticle); //number 1

router.post('/add-article',    //number 1 //validation is created in router and use in controller                      
    [                                             //check if those codes in article.js in controllers works 
      body('title')                                //replace these codes with those   
        .isString()                                  //callbacks can be added to router with arrays
        .isLength({ min: 3 }),
       // .trim(),
   //   body('price').isFloat(),                        //check //correct
      body('articleAbstract').isString(),

      body('articleBody')
      //  .isLength({ min: 5, max: 400 })
      //  .trim()
      .isString(),
    ],
    isAuth,
    articleController.postAddArticle
  );                                                                

router.get('/edit-article/:articleId', isAuth, articleController.getEditArticle); //number 2
/* //check
router.post(                                                                    //number 2            
    '/edit-product',
    [
      body('title')
        .isString()
        .isLength({ min: 3 })
        .trim(),
      body('price').isFloat(),
      body('description')
        .isLength({ min: 5, max: 400 })
        .trim()
    ],
    isAuth,
    adminController.postEditProduct
  );
*/  
router.delete('/article-manager/:articleId', isAuth, articleController.deleteArticle); //number 3  //check
/*





router.get('/', shopController.getIndex);
*/
router.get('/article-manager/author-articles',isAuth, articleController.getAuthorArticles);
router.get('/article-manager/article-list', articleController.getArticles);
/*
router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

router.get('/orders', isAuth, shopController.getOrders);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);
*/  //check
module.exports = router;
