const { Project } = require('../models');

const generateIssueKey = async (projectId) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw new Error('Project not found');
  const counter = project.issueCounter + 1;
  await project.update({ issueCounter: counter });
  return `${project.key}-${counter}`;
};

module.exports = { generateIssueKey };
