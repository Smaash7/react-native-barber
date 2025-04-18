import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Barber from "../models/Barber.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, rating, image } = req.body;
    if (!title || !caption || !rating || !image) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    //upload image to cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url;

    // save to the database
    const newBarber = new Barber({
      title,
      caption,
      rating,
      image: imageUrl,
      user: req.user._id,
    });

    await newBarber.save();
    res.status(201).json(newBarber);
  } catch (error) {
    console.log("Error creating barber", error.message);
    res.status(500).json({ message: "Token is not valid" });
  }
});

// pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 5;
    const skip = (page - 1) * limit;

    const barbers = await Barber.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage");

    const totalBarbers = await Barber.countDocuments();

    res.send({
      barbers,
      currentPage: page,
      totalBarbers,
      totalPages: Math.ceil(totalBarbers / limit),
    });
  } catch (error) {
    console.log("Error fetching barbers", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// get recommended barbers by the logged in user
router.get("/user", protectRoute, async (req, res) => {
  try {
    const barbers = await Barber.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(barbers);
  } catch (error) {
    console.error("Error fetching barbers", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const barber = await Barber.findByIdAndDelete(req.params.id);
    if (!barber) {
      return res.status(404).json({ message: "Barber not found" });
    }
    // check if user is the creator of the book
    if (barber.user.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "You can't delete this barber" });

    //delete image from cloudinary as well
    if (barber.image && barber.image.includes("cloudinary")) {
      try {
        const publicId = barber.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.log("Error deleting image from cloudinary", deleteError);
      }
    }
    await barber.deleteOne();

    res.json({ message: "Barber deleted successfully" });
  } catch (error) {
    console.log("Error deleting barber", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
