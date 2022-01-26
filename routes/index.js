const express = require('express');
const csrf = require('csurf');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

const Product = require('../models/product');
const Category = require('../models/category');
const Cart = require('../models/cart');
const Order = require('../models/order');
const middleware = require('../middleware');
const router = express.Router();

const csrfProtection = csrf();
router.use(csrfProtection);

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('category')
      .sort('-createdAt');
    res.render('shop/home', { pageName: 'Home', products });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

router.get('/add-to-cart/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    let userCart;
    if (req.user) {
      userCart = await Cart.findOne({ user: req.user._id });
    }
    let cart;
    if (
      (req.user && !userCart && req.session.cart) ||
      (!req.user && req.session.cart)
    ) {
      cart = await new Cart(req.session.cart);
    } else if (!req.user || !userCart) {
      cart = new Cart({});
    } else {
      cart = userCart;
    }

    // add to the cart
    const product = await Product.findById(productId);
    const itemIdx = cart.items.findIndex(p => p.productId == productId);
    if (itemIdx > -1) {
      cart.items[itemIdx].qty++;
      cart.items[itemIdx].price = cart.items[itemIdx].qty * product.price;
      cart.totalQty++;
      cart.totalCost += product.price;
    } else {
      cart.items.push({
        productId: productId,
        qty: 1,
        price: product.price,
        title: product.title,
        productCode: product.productCode,
      });
      cart.totalQty++;
      cart.totalCost += product.price;
    }

    if (req.user) {
      cart.user = req.user._id;
      await cart.save();
    }
    req.session.cart = cart;
    req.flash('success', 'Product added to your cart.');
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect('/');
  }
});

router.get('/shopping-cart', async (req, res) => {
  try {
    let cart_user;
    if (req.user) {
      cart_user = await Cart.findOne({ user: req.user._id });
    }
    if (req.user && cart_user) {
      req.session.cart = cart_user;
      return res.render('shop/shopping-cart', {
        cart: cart_user,
        pageName: 'Shopping Cart',
        products: await productsFromCart(cart_user),
      });
    }
    if (!req.session.cart) {
      return res.render('shop/shopping-cart', {
        cart: null,
        pageName: 'Shopping Cart',
        products: null,
      });
    }
    return res.render('shop/shopping-cart', {
      cart: req.session.cart,
      pageName: 'Shopping Cart',
      products: await productsFromCart(req.session.cart),
    });
  } catch (err) {
    console.log(err.message);
    res.redirect('/');
  }
});

router.get('/reduce/:id', async function (req, res, next) {
  const productId = req.params.id;
  let cart;
  try {
    if (req.user) {
      cart = await Cart.findOne({ user: req.user._id });
    } else if (req.session.cart) {
      cart = await new Cart(req.session.cart);
    }

    let itemIndex = cart.items.findIndex(p => p.productId == productId);
    if (itemIndex > -1) {
      const product = await Product.findById(productId);
      cart.items[itemIndex].qty--;
      cart.items[itemIndex].price -= product.price;
      cart.totalQty--;
      cart.totalCost -= product.price;
      if (cart.items[itemIndex].qty <= 0) {
        await cart.items.remove({ _id: cart.items[itemIndex]._id });
      }
      req.session.cart = cart;
      if (req.user) {
        await cart.save();
      }
      if (cart.totalQty <= 0) {
        req.session.cart = null;
        await Cart.findByIdAndRemove(cart._id);
      }
    }
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect('/');
  }
});

router.get('/removeAll/:id', async function (req, res, next) {
  const productId = req.params.id;
  let cart;
  try {
    if (req.user) {
      cart = await Cart.findOne({ user: req.user._id });
    } else if (req.session.cart) {
      cart = await new Cart(req.session.cart);
    }
    let itemIndex = cart.items.findIndex(p => p.productId == productId);
    if (itemIndex > -1) {
      cart.totalQty -= cart.items[itemIndex].qty;
      cart.totalCost -= cart.items[itemIndex].price;
      await cart.items.remove({ _id: cart.items[itemIndex]._id });
    }
    req.session.cart = cart;
    if (req.user) {
      await cart.save();
    }
    if (cart.totalQty <= 0) {
      req.session.cart = null;
      await Cart.findByIdAndRemove(cart._id);
    }
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect('/');
  }
});

// GET: checkout form with csrf token
router.get('/checkout', middleware.isLoggedIn, async (req, res, next) => {
  const errorMsg = req.flash('error')[0];

  if (!req.session.cart) {
    return res.redirect('/shopping-cart');
  }
  //load the cart with the session's cart's id from the db
  cart = await Cart.findById(req.session.cart._id);

  res.render('shop/checkout', {
    pageName: 'Checkout',
    errorMsg,
    total: cart.totalCost,
    csrfToken: req.csrfToken(),
  });
});

// POST: handle checkout logic and payment using Stripe
router.post('/checkout', middleware.isLoggedIn, async (req, res) => {
  if (!req.session.cart) {
    return res.redirect('/shopping-cart');
  }
  const cart = await Cart.findById(req.session.cart._id);
  stripe.charges.create(
    {
      amount: cart.totalCost * 100,
      currency: 'usd',
      source: req.body.stripeToken,
      description: 'Chargin stripe',
    },
    function (err, charge) {
      if (err) {
        console.log(err);
        req.flash('error', err.message);
        return res.redirect('/checkout');
      }
      const order = new Order({
        user: req.user,
        cart: {
          items: cart.items,
          totalQty: cart.totalQty,
          totalCost: cart.totalCost,
        },
        address: req.body.address,
        paymentId: charge.id,
      });
      order.save(async err => {
        if (err) {
          console.log(err);
          return res.redirect('/checkout');
        }
        await cart.save();
        await Cart.findByIdAndDelete(cart._id);
        req.flash('success', 'Successfully purchased');
        req.session.cart = null;
        res.redirect('/user/profile');
      });
    }
  );
});

async function productsFromCart(cart) {
  let products = [];
  for (const item of cart.items) {
    let foundProduct = (
      await Product.findById(item.productId).populate('category')
    ).toObject();
    foundProduct['qty'] = item.qty;
    foundProduct['totalPrice'] = item.price;
    products.push(foundProduct);
  }
  return products;
}

module.exports = router;
