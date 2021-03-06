const { Router } = require("express");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const sequelize = require("sequelize");
const posts = new Router();
const passport = require("passport");
const validatePost = require("../validation/post");
const models = require("../models");
const comments = require("./comments");
const { getPosts, getPostsWithAuth } = require("../utils/utils");
const PostModel = models.Post;
const PostLikeModel = models.PostLike;
const PostDislikeModel = models.PostDislike;

posts.use("/:PostId/comments", comments);

const response = (res, msg, status = 200) => {
  return res.status(status).json(msg);
};

// PUBLIC : Get random
posts.get("/random", async (req, res, next) => {
  const posts = await PostModel.findAll({
    order: [sequelize.fn("RANDOM")],
    limit: 4,
  });
  if (posts) {
    return response(res, posts);
  } else {
    return response(res, { msg: "Something went wrong" });
  }
});

// PUBLIC : GET All
posts.get("/", async (req, res, next) => {
  let posts;
  if (req.headers.authorization) {
    const { username } = req.headers;
    const token = req.headers.authorization.split(" ")[1];
    await jwt.verify(token, keys.secretOrKey, async (err, decoded) => {
      if (err) {
        return response(res, "Unauthorized: Invalid token", 401);
      } else {
        posts = await getPostsWithAuth(username);
      }
    });
  } else {
    posts = await getPosts();
  }

  Object.entries(posts).forEach(([key, value]) => {
    value.dataValues.Score =
      value.dataValues.LikeCount - value.dataValues.DislikeCount;
    if (!value.dataValues.PostDislikes || !value.dataValues.PostDislikes) {
      value.dataValues.PostDislikes = [];
      value.dataValues.PostLikes = [];
    }
  });

  if (posts) {
    return response(res, posts);
  } else {
    return response(res, { msg: "Something went wrong" }, 400);
  }
});

// PRIVATE : Create new post
posts.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    const { errors, isValid } = validatePost(req.body);
    const { Title, Body } = req.body;
    const { Username } = req.user.dataValues;

    if (!isValid) return response(res, errors, 400);

    const post = await PostModel.create({
      Title,
      Body,
      Username,
    });

    if (post) {
      const postLike = await PostLikeModel.create({
        PostId: post.dataValues.id,
        Username,
      });

      if (post && postLike) {
        return response(res, { msg: "Post added", post });
      }
    }

    return response(res, { msg: "Something went wrong." }, 400);
  }
);

// PUBLIC : GET one by ID
posts.get("/:id", async (req, res, next) => {
  const { id } = req.params;
  const post = await PostModel.findOne({ where: { id } });
  if (post) {
    return response(res, post);
  } else {
    return response(res, { msg: "Post not found" }, 404);
  }
});

// PRIVATE : Delete Post
posts.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    const { id } = req.params;
    const { Username } = req.user.dataValues;
    const post = await PostModel.findOne({ where: { id } });

    if (Username === post.dataValues.Username) {
      const confirmed = await PostModel.destroy({ where: { id } });

      if (confirmed) {
        return response(res, { msg: "Post deleted." });
      }
    } else {
      return response(res, { msg: "Permission denied." }, 401);
    }
    return response(res, { msg: "Something went wrong" }, 400);
  }
);

// PRIVATE : Edit Post
posts.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    console.log(req);
    const { id } = req.params;
    const updated = await PostModel.update(
      { Body: req.body.Body },
      { where: { id } }
    );

    if (updated) {
      return response(res, { msg: "Post updated successfully." });
    } else {
      return response(res, { msg: "Something went wrong" }, 400);
    }
  }
);

// Private Route : Like post
posts.post(
  "/:PostId/:Like",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    const { PostId, Like } = req.params;
    const { Username } = req.user.dataValues;
    const post = await PostModel.findOne({ where: { id: PostId } });

    if (!post) {
      return response(res, "Post not found.", 404);
    } else {
      const [PostAlreadyLiked, PostAlreadyDisliked] = await Promise.all([
        PostLikeModel.findOne({
          where: { Username, PostId },
        }),
        PostDislikeModel.findOne({
          where: { Username, PostId },
        }),
      ]);
      let confirmDestroy = null;

      if (Like == 1) {
        if (PostAlreadyDisliked) {
          confirmDestroy = await PostAlreadyDisliked.destroy();
          await PostLikeModel.create({
            PostId,
            Username,
          });
          if (confirmDestroy) {
            return response(res, { msg: "Liked and Disliked" });
          }
        } else if (PostAlreadyLiked) {
          confirmDestroy = await PostAlreadyLiked.destroy();
          if (confirmDestroy) {
            return response(res, { msg: "Removed Like" });
          }
        }
        const confirmLike = await PostLikeModel.create({
          PostId,
          Username,
        });
        if (confirmLike) {
          return response(res, { msg: "Liked" });
        }
      } else if (Like == 0) {
        if (PostAlreadyLiked) {
          confirmDestroy = await PostAlreadyLiked.destroy();
          await PostDislikeModel.create({
            PostId,
            Username,
          });
          if (confirmDestroy) {
            return response(res, { msg: "Disliked and Liked" });
          }
        } else if (PostAlreadyDisliked) {
          confirmDestroy = await PostAlreadyDisliked.destroy();
          if (confirmDestroy) {
            return response(res, { msg: "Removed Dislike" });
          }
        }
        const confirmDislike = await PostDislikeModel.create({
          PostId,
          Username,
        });
        if (confirmDislike) {
          return response(res, { msg: "Disliked" });
        }
      }
    }
    return response(res, { msg: "Something went wrong" }, 400);
  }
);

module.exports = posts;
