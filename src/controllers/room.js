const UserModel = require("../models/user");
const RoomModel = require("../models/room");
const ConversationModel = require("../models/conversation");

async function add(req, res, next) {
  const { name, desc, creator, members } = req.body;
  try {
    const existUser = await UserModel.findById(creator);

    if (!existUser) {
      return res.status(404).json({ msg: `User not found !` });
    }

    const newRoom = new RoomModel({
      name,
      desc,
      creator,
      password: req.body?.password && req.body?.password,
      members: members ? [...members, creator] : [creator],
      isPublic: req.body?.isPublic && req.body?.isPublic,
    });

    const newConversation = new ConversationModel({
      participants: members ? [...members, creator] : [creator],
      room: newRoom._id,
      messages: [],
    });

    existUser.rooms.push(newRoom._id);

    await newConversation.save();
    await newRoom.save();
    await existUser.save();

    return res.status(201).json(newRoom);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  const { searchTerm, roomId, userId } = req.query;
  try {
    let desiredResponse = {
      result: [],
      myRooms: [],
    };
    let allRooms = [];

    if (searchTerm && roomId) {
      allRooms = await RoomModel.find({
        name: new RegExp(searchTerm, "i"),
        _id: { $ne: roomId },
      }).select("name isPublic members");
    } else if (searchTerm) {
      allRooms = await RoomModel.find({
        name: new RegExp(searchTerm, "i"),
      }).select("name isPublic members");
    } else {
      allRooms = await RoomModel.find();
    }

    const populatedRooms = await RoomModel.populate(allRooms, [
      { path: "members", select: "firstname username" },
      // { path: "messages", select: "content" },
    ]);

    if (userId) {
      for (const room of populatedRooms) {
        const isPartOfRoom = room.members.some((r) => r.id == userId);

        if (isPartOfRoom) {
          desiredResponse.myRooms.push({ room: { ...room.toObject() } });
        } else {
          desiredResponse.result.push({ room: { ...room.toObject() } });
        }
      }
    } else {
      delete desiredResponse.myRooms;
      console.log(populatedRooms);

      const a = populatedRooms.map((r) => {
        return { room: { ...r.toObject() } };
      });
      desiredResponse.result.push(...a);
    }

    return res.status(200).json(desiredResponse);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  const { userId } = req.query;
  try {
    let specifiedRoom = await RoomModel.findById(req.params.id);

    if (!specifiedRoom) {
      return res.status(400).json({ msg: `Room not found !` });
    }

    if (userId) {
      specifiedRoom = {
        ...specifiedRoom._doc,
        isMember: specifiedRoom.members.includes(userId),
      };
    }

    const populatedRoom = await RoomModel.populate(specifiedRoom, [
      { path: "members", select: "firstname username" },
      { path: "messages", select: "content" },
    ]);

    return res.status(200).json(populatedRoom);
  } catch (err) {
    next(err);
  }
}

async function editOne(req, res, next) {
  try {
    const existRoom = await RoomModel.findById(req.params.id);
    const existConversation = await ConversationModel.findOne({
      room: existRoom._id,
    });

    if (!existRoom) {
      return res.status(400).json({ msg: `Room not found !` });
    }

    for (const key of Object.keys(req.body)) {
      if (key == "members") {
        for (const { status, content } of req.body.members) {
          if (status == 1) {
            const foundRoomIndex = existRoom.members.indexOf(content);
            const foundParticipantIndex =
              existConversation.participants.indexOf(content);

            if (foundRoomIndex === -1) {
              existRoom.members.push(content);
            }
            if (foundParticipantIndex === -1) {
              existConversation.participants.push(content);
            }
          } else if (status == 0) {
            const foundRoomIndex = existRoom.members.indexOf(content);
            const foundParticipantIndex =
              existConversation.participants.indexOf(content);

            if (foundRoomIndex !== -1) {
              existRoom.members.splice(content, 1);
            }
            if (foundParticipantIndex !== -1) {
              existConversation.participants.splice(content, 1);
            }
          }
        }
      } else {
        existRoom[key] = req.body[key];
      }
    }

    await existRoom.save();

    const populatedRoom = await RoomModel.populate(existRoom, [
      { path: "members", select: "firstname username" },
      { path: "creator", select: "firstname username" },
      { path: "messages", select: "content" },
    ]);

    return res.status(200).json(populatedRoom);
  } catch (err) {
    next(err);
  }
}

async function deleteOne(req, res, next) {
  try {
    const deletedRoom = await RoomModel.findByIdAndDelete(req.params.id);

    if (!deletedRoom) {
      return res.status(400).json({ msg: `Room not found !` });
    }

    return res.status(200).json(deletedRoom);
  } catch (err) {
    next(err);
  }
}

async function getRoomMembers(req, res, next) {
  try {
    const specifiedRoom = await RoomModel.findById(req.params.id).populate(
      "members",
      "firstname username"
    );

    if (!specifiedRoom) {
      return res.status(400).json({ msg: `Room not found !` });
    }

    return res.status(200).json(specifiedRoom.members);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  add,
  getAll,
  getOne,
  editOne,
  deleteOne,
  getRoomMembers,
};
