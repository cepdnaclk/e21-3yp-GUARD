import { publishTankActuatorCommand } from "../services/actuatorService.js";

export const sendActuatorCommand = async (req, res) => {
  const { tankId } = req.params;
  const { command } = req.body;

  try {
    const result = await publishTankActuatorCommand(tankId, command, req.user);

    return res.status(202).json({
      message: `${command} command queued.`,
      tankId,
      command,
      topic: result.topic,
      payload: result.payload,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("Actuator publish error:", error);
    return res.status(503).json({ error: "Failed to publish actuator command." });
  }
};
