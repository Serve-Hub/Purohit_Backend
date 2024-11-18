import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.model.js"; // Import user model

// Google OAuth strategy configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/v1/users/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          // User already exists, you may want to update their profile if needed
          user.email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : user.email;
          user.firstName = profile.name.givenName || user.firstName;
          user.lastName = profile.name.familyName || user.lastName;
          user.avatar =
            profile.photos && profile.photos.length > 0
              ? profile.photos[0].value
              : user.avatar;

          // Save updated user information if changes were made
          await user.save();
        } else {
          // If user does not exist, create a new user
          user = await User.create({
            googleId: profile.id,
            email:
              profile.emails && profile.emails.length > 0
                ? profile.emails[0].value
                : null,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            isVerified: true,
            avatar:
              profile.photos && profile.photos.length > 0
                ? profile.photos[0].value
                : null,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
