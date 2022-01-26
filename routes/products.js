const express = require('express');
const Product = require('../models/product');
const Category = require('../models/category');
const moment = require('moment');

const router = express.Router();

router.get('/', async (req, res) => {
  const perPage = 12;
  const errorMsg = req.flash('error')[0];
  const successMsg = req.flash('success')[0];
  let page = +req.query.page || 1;
  try {
    const products = await Product.find({})
      .populate('category')
      .skip(perPage * page - perPage)
      .limit(perPage)
      .sort('-createdAt');

    const count = await Product.count();

    res.render('shop/index', {
      pageName: 'All Products',
      products,
      current: page,
      pages: Math.ceil(count / perPage),
      errorMsg,
      successMsg,
      breadcrumbs: null,
      home: '/products/?',
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/search', async (req, res) => {
  const perPage = 12;
  let page = +req.query.page || 1;
  const errorMsg = req.flash('error')[0];
  const successMsg = req.flash('success')[0];

  try {
    const products = await Product.find({
      title: { $regex: req.query.search, $options: 'i' },
    })
      .populate('category')
      .limit(perPage)
      .skip(perPage * page - perPage)
      .sort('-createdAt')
      .exec();
    const count = await Product.count({
      title: { $regex: req.query.search, $options: 'i' },
    });
    res.render('shop/index', {
      pageName: 'Search Results',
      products,
      errorMsg,
      successMsg,
      current: page,
      pages: Math.ceil(count / perPage),
      breadcrumbs: null,
      home: '/products/search?search=' + req.query.search + '&',
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/:slug', async (req, res) => {
  const successMsg = req.flash('success')[0];
  const errorMsg = req.flash('error')[0];
  const perPage = 12;
  let page = parseInt(req.query.page) || 1;
  try {
    const foundCategory = await Category.findOne({ slug: req.params.slug });
    const allProducts = await Product.find({ category: foundCategory.id })
      .sort('-createdAt')
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate('category');

    const count = await Product.count({ category: foundCategory.id });

    res.render('shop/index', {
      pageName: foundCategory.title,
      currentCategory: foundCategory,
      products: allProducts,
      successMsg,
      errorMsg,
      current: page,
      breadcrumbs: req.breadcrumbs,
      home: '/products/' + req.params.slug.toString() + '/?',
      pages: Math.ceil(count / perPage),
    });
  } catch (error) {
    console.log(error);
    return res.redirect('/');
  }
});

router.get('/:slug/:id', async (req, res) => {
  const successMsg = req.flash('success')[0];
  const errorMsg = req.flash('error')[0];
  try {
    const product = await Product.findById(req.params.id).populate('category');
    res.render('shop/product', {
      pageName: product.title,
      product,
      successMsg,
      errorMsg,
      moment: moment,
    });
  } catch (error) {
    console.log(error);
    return res.redirect('/');
  }
});

module.exports = router;
