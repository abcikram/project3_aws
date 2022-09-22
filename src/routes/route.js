const express = require('express')
const router = express.Router()

const userController = require("../controllers/userController")
const bookController = require("../controllers/bookController")
const middleware = require("../middleware/auth")
const reviewController = require("../controllers/reviewController")


router.post("/register", userController.createUser)
router.post("/login", userController.userLogin)
router.post("/books", middleware.Authentication, bookController.createBooks)
router.get("/books", middleware.Authentication, bookController.getBooksByQuery)
router.get("/books/:bookId", middleware.Authorization, bookController.getBooksId)
router.put("/books/:bookId", middleware.Authorization, bookController.updateBooks)
router.delete("/books/:bookId", middleware.Authorization, bookController.deleteBooksId)

router.post("/books/:bookId/review", reviewController.createReviews)

module.exports = router