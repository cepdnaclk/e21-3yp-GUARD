import { publishTankActuatorCommand } from "../services/actuatorService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const sendActuatorCommand = asyncHandler(async (req, res) => {
  const { tankId } = req.params;
  const { command } = req.body;

  const result = await publishTankActuatorCommand(tankId, command, req.user);

  return res.status(202).json({
    message: `${command} command queued.`,
    tankId,
    command,
    topic: result.topic,
    payload: result.payload,
  });
});
