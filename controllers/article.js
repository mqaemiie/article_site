const fs = require('fs');
const path = require('path');

const { check,validationResult } = require('express-validator/check'); //number 1 //ok

const mongoose = require('mongoose'); //check

const Article = require('../models/article'); //ok


const PDFDocument = require('pdfkit');
const stripe = require('stripe')('sk_test_BMD9aaviqJzK0hlROg2KMRbD');

const Product = require('../models/article');
//const Order = require('../models/order'); //ok

const ITEMS_PER_PAGE = 2;

exports.getAuthorArticles = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Article.find({ userId: req.user._id })
    .countDocuments()
    .then(numArticles => {
      totalItems = numArticles;
      return Article.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(articles => {
      console.log(articles);
       res.render('article-manager/author-articles', {    
      //prods: articles,
        artcles: articles,
        pageTitle: 'Articles',
        path: '/article-manager/author-articles',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
      console.log('finished author articles');
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getArticles = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Article.find()
    .countDocuments()
    .then(numArticles => {
      totalItems = numArticles;
      return Article.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(articles => {
      console.log(articles);
      res.render('article-manager/article-list', {     
        //prods: articles,
        articles: articles,
        pageTitle: 'Articles',
        path: '/article-manager/article-list',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
      console.log('finished articles');
    })
    .catch(err => {
      console.log('eroooooor');
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      let total = 0;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum: total
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express
  let totalSum = 0;

  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {  
      user.cart.items.forEach(p => {
        totalSum += p.quantity * p.productId.price;
      });

      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      const charge = stripe.charges.create({
        amount: totalSum * 100,
        currency: 'usd',
        description: 'Demo Order',
        source: token,
        metadata: { order_id: result._id.toString() }
      });
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No order found.'));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('Unauthorized'));
      }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });
      pdfDoc.text('-----------------------');
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              ' - ' +
              prod.quantity +
              ' x ' +
              '$' +
              prod.product.price
          );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

      pdfDoc.end();
      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader(
      //     'Content-Disposition',
      //     'inline; filename="' + invoiceName + '"'
      //   );
      //   res.send(data);
      // });
      // const file = fs.createReadStream(invoicePath);

      // file.pipe(res);
    })
    .catch(err => next(err));
};





exports.getAddArticle = (req, res, next) => {
  res.render('article-manager/edit-article', {
    pageTitle: 'Add Article',
    path: '/  ticle',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};                                                    //number 1                             

exports.postAddArticle = (req, res, next) => {
  const title = req.body.title;
  const articleAbstract = req.body.articleAbstract;     //number 1 // add these items to form
  const articleBody = req.body.articleBody;             //number 1 // add these items to form
  //const image = req.file;
  //const price = req.body.price;
  //const description = req.body.description;

 /* if(check('title')                         //check the ifs is not synchronous.
  .isString()                                //check if these statements will not work you need to use old maximillian code
                                                //which put validation in the callbacks in the array.       
  .isLength({min:20, max:40})
  //.trim() //check
  ){
  return res.status(422).render('article-manager/edit-article', {
    pageTitle: 'Add Article',
    path: '/article-manager/add-article',
    editing: false,
    hasError: true,
    article: {            //check implement these in view and edit
      title: title,
      articleAbstract: articleAbstract,
      articleBody: articleBody
    },
    errorMessage: 'the title must be under 40 char and less than 20 char.',
    validationErrors: []    //check
  }); 
};

if(check('articleAbstract')
  .isString()
  .isLength({min:1000, max:1500})
  //.trim() //check
){
  return res.status(422).render('article-manager/edit-article', {
    pageTitle: 'Add Article',
    path: '/article-manager/add-article',
    editing: false,
    hasError: true,
    article: {            //check implement these in view and edit
      title: title,
      articleAbstract: articleAbstract,
      articleBody: articleBody
    },
    errorMessage: 'the title must be under 1500 char and more than 1000 char.',
    validationErrors: []    //check
  }); 
};

if(check('articleBody')
  .isString()
  .isLength({min:300, max:500})
  //.trim() //check
){
  return res.status(422).render('article-manager/edit-article', {
    pageTitle: 'Add Article',
    path: '/article-manager/add-article',
    editing: false,
    hasError: true,
    article: {            //check implement these in view and edit
      title: title,
      articleAbstract: articleAbstract,
      articleBody: articleBody
    },
    errorMessage: 'the title must be under 40 char and less than 20 char.',
    validationErrors: []    //check
  }); 
};
  
*/  
const errors = validationResult(req);

  if (!errors.isEmpty()) {                  //check and implement error handling
    console.log(errors.array());
    return res.status(422).render('article-manager/edit-article', {
      pageTitle: 'Add Article',
      path: '/add-article',
      editing: false,
      hasError: true,
      article: {            //check implement these in view and edit
        title: title,
        articleAbstract: articleAbstract,
        articleBody: articleBody
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  //const imageUrl = image.path;

  const article = new Article({
    // _id: new mongoose.Types.ObjectId('5badf72403fd8b5be0366e81'),
    title: title,
    articleAbstract: articleAbstract,
    articleBody: articleBody,
    //price: price,      //number 1 //ok
    //description: description, //number 1 //ok
    //imageUrl: imageUrl, //number 1 //ok
    userId: req.user  //check
  });
  article
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Article');
      res.redirect('/add-article'); //check
    })
    .catch(err => {
      // return res.status(500).render('admin/edit-product', {
      //   pageTitle: 'Add Product',
      //   path: '/admin/add-product',
      //   editing: false,
      //   hasError: true,
      //   product: {
      //     title: title,
      //     imageUrl: imageUrl,
      //     price: price,
      //     description: description
      //   },
      //   errorMessage: 'Database operation failed, please try again.',
      //   validationErrors: []
      // });
      // res.redirect('/500');
      const error = new Error(err);    //check
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditArticle = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const articleId = req.params.articleId;
  Product.findById(articleId)
    .then(article => {
      if (!article) {
        return res.redirect('/');
      }
      res.render('article-manager/edit-product', {
        pageTitle: 'Edit Product',
        path: '/article-manager/edit-product',
        editing: editMode,
        article: article,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {               //check create a local server and test this controller
  Product.find({ userId: req.user._id })
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteArticle = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found.'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({ message: 'Success!' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Deleting product failed.' });
    });
};


