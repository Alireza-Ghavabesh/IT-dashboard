/**
 * BPMN 2.0 XML Starter Templates
 * Pre-configured with Persian labels, process metadata and vivid BPMNDI color schemes (bioc & color)
 */

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a full standard business process BPMN with Pool & Lane,
 * decision gateway, and action tasks with vivid modern colors.
 */
export function generateStandardBpmnXml(processName: string, orgUnit: string): string {
  const pName = escapeXml(processName || 'فرآیند سازمانی');
  const unitName = escapeXml(orgUnit || 'واحد سازمانی');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="${pName}" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="${unitName}">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Gateway_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_2</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="شروع">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Activity_1" name="ثبت و ارسال در سامانه">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_1" name="بررسی و کنترل">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Activity_2" name="انجام عملیات و تایید نهایی">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="اتمام فرآیند">
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_3" name="تایید" sourceRef="Gateway_1" targetRef="Activity_2" />
    <bpmn:sequenceFlow id="Flow_4" name="رد / عدم تایید" sourceRef="Gateway_1" targetRef="EndEvent_1" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Activity_2" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true" bioc:stroke="#1e293b" bioc:fill="#f8fafc" color:border-color="#1e293b" color:background-color="#f8fafc">
        <dc:Bounds x="160" y="80" width="760" height="280" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true" bioc:stroke="#475569" bioc:fill="#ffffff" color:border-color="#475569" color:background-color="#ffffff">
        <dc:Bounds x="190" y="80" width="730" height="280" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1" bioc:stroke="#16a34a" bioc:fill="#dcfce7" color:border-color="#16a34a" color:background-color="#dcfce7">
        <dc:Bounds x="232" y="192" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="238" y="235" width="25" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1" bioc:stroke="#0284c7" bioc:fill="#e0f2fe" color:border-color="#0284c7" color:background-color="#e0f2fe">
        <dc:Bounds x="320" y="170" width="120" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true" bioc:stroke="#d97706" bioc:fill="#fef3c7" color:border-color="#d97706" color:background-color="#fef3c7">
        <dc:Bounds x="485" y="185" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="477" y="155" width="67" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_2_di" bpmnElement="Activity_2" bioc:stroke="#0d9488" bioc:fill="#ccfbf1" color:border-color="#0d9488" color:background-color="#ccfbf1">
        <dc:Bounds x="580" y="170" width="130" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1" bioc:stroke="#dc2626" bioc:fill="#fee2e2" color:border-color="#dc2626" color:background-color="#fee2e2">
        <dc:Bounds x="762" y="192" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="755" y="235" width="51" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1" bioc:stroke="#0284c7" color:border-color="#0284c7">
        <di:waypoint x="268" y="210" />
        <di:waypoint x="320" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2" bioc:stroke="#475569" color:border-color="#475569">
        <di:waypoint x="440" y="210" />
        <di:waypoint x="485" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3" bioc:stroke="#16a34a" color:border-color="#16a34a">
        <di:waypoint x="535" y="210" />
        <di:waypoint x="580" y="210" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="548" y="192" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4" bioc:stroke="#dc2626" color:border-color="#dc2626">
        <di:waypoint x="510" y="235" />
        <di:waypoint x="510" y="290" />
        <di:waypoint x="780" y="290" />
        <di:waypoint x="780" y="228" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="615" y="272" width="60" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5" bioc:stroke="#0d9488" color:border-color="#0d9488">
        <di:waypoint x="710" y="210" />
        <di:waypoint x="762" y="210" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

/**
 * Generates a multi-lane approval workflow with Request and Approval lanes.
 */
export function generateApprovalBpmnXml(processName: string, orgUnit: string): string {
  const pName = escapeXml(processName || 'فرآیند تایید و تصویب');
  const unitName = escapeXml(orgUnit || 'واحد مجری');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" id="Definitions_Approval" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_Approval">
    <bpmn:participant id="Participant_Approval" name="${pName}" processRef="Process_Approval" />
  </bpmn:collaboration>
  <bpmn:process id="Process_Approval" isExecutable="false">
    <bpmn:laneSet id="LaneSet_Approval">
      <bpmn:lane id="Lane_Requester" name="${unitName} (متقاضی)">
        <bpmn:flowNodeRef>StartEvent_App</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Draft</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_AppSuccess</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_Manager" name="مدیریت و تاییدکننده">
        <bpmn:flowNodeRef>Task_Review</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Gateway_Approval</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_Approve</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_AppReject</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_App" name="شروع درخواست">
      <bpmn:outgoing>Flow_App1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_Draft" name="تنظیم و ارسال پیش‌نویس">
      <bpmn:incoming>Flow_App1</bpmn:incoming>
      <bpmn:outgoing>Flow_App2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_Review" name="بررسی کارشناسی و مدارک">
      <bpmn:incoming>Flow_App2</bpmn:incoming>
      <bpmn:outgoing>Flow_App3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_Approval" name="وضعیت تایید؟">
      <bpmn:incoming>Flow_App3</bpmn:incoming>
      <bpmn:outgoing>Flow_AppYes</bpmn:outgoing>
      <bpmn:outgoing>Flow_AppNo</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_Approve" name="ثبت قطعی و ابلاغ سازمانی">
      <bpmn:incoming>Flow_AppYes</bpmn:incoming>
      <bpmn:outgoing>Flow_AppFinish</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_AppSuccess" name="پایان موفق">
      <bpmn:incoming>Flow_AppFinish</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="EndEvent_AppReject" name="رد درخواست">
      <bpmn:incoming>Flow_AppNo</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_App1" sourceRef="StartEvent_App" targetRef="Task_Draft" />
    <bpmn:sequenceFlow id="Flow_App2" sourceRef="Task_Draft" targetRef="Task_Review" />
    <bpmn:sequenceFlow id="Flow_App3" sourceRef="Task_Review" targetRef="Gateway_Approval" />
    <bpmn:sequenceFlow id="Flow_AppYes" name="تایید" sourceRef="Gateway_Approval" targetRef="Task_Approve" />
    <bpmn:sequenceFlow id="Flow_AppNo" name="عدم تایید" sourceRef="Gateway_Approval" targetRef="EndEvent_AppReject" />
    <bpmn:sequenceFlow id="Flow_AppFinish" sourceRef="Task_Approve" targetRef="EndEvent_AppSuccess" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Approval">
    <bpmndi:BPMNPlane id="BPMNPlane_Approval" bpmnElement="Collaboration_Approval">
      <bpmndi:BPMNShape id="Participant_App_di" bpmnElement="Participant_Approval" isHorizontal="true" bioc:stroke="#0f172a" bioc:fill="#f8fafc" color:border-color="#0f172a" color:background-color="#f8fafc">
        <dc:Bounds x="160" y="80" width="800" height="380" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Requester_di" bpmnElement="Lane_Requester" isHorizontal="true" bioc:stroke="#0284c7" bioc:fill="#ffffff" color:border-color="#0284c7" color:background-color="#ffffff">
        <dc:Bounds x="190" y="80" width="770" height="180" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Manager_di" bpmnElement="Lane_Manager" isHorizontal="true" bioc:stroke="#7c3aed" bioc:fill="#faf5ff" color:border-color="#7c3aed" color:background-color="#faf5ff">
        <dc:Bounds x="190" y="260" width="770" height="200" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_App_di" bpmnElement="StartEvent_App" bioc:stroke="#16a34a" bioc:fill="#dcfce7" color:border-color="#16a34a" color:background-color="#dcfce7">
        <dc:Bounds x="232" y="152" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="216" y="195" width="69" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Draft_di" bpmnElement="Task_Draft" bioc:stroke="#0284c7" bioc:fill="#e0f2fe" color:border-color="#0284c7" color:background-color="#e0f2fe">
        <dc:Bounds x="320" y="130" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Review_di" bpmnElement="Task_Review" bioc:stroke="#7c3aed" bioc:fill="#ede9fe" color:border-color="#7c3aed" color:background-color="#ede9fe">
        <dc:Bounds x="320" y="320" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Approval_di" bpmnElement="Gateway_Approval" isMarkerVisible="true" bioc:stroke="#d97706" bioc:fill="#fef3c7" color:border-color="#d97706" color:background-color="#fef3c7">
        <dc:Bounds x="505" y="335" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="498" y="305" width="65" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Approve_di" bpmnElement="Task_Approve" bioc:stroke="#0d9488" bioc:fill="#ccfbf1" color:border-color="#0d9488" color:background-color="#ccfbf1">
        <dc:Bounds x="610" y="320" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_AppReject_di" bpmnElement="EndEvent_AppReject" bioc:stroke="#dc2626" bioc:fill="#fee2e2" color:border-color="#dc2626" color:background-color="#fee2e2">
        <dc:Bounds x="512" y="412" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="502" y="455" width="57" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_AppSuccess_di" bpmnElement="EndEvent_AppSuccess" bioc:stroke="#16a34a" bioc:fill="#dcfce7" color:border-color="#16a34a" color:background-color="#dcfce7">
        <dc:Bounds x="822" y="152" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="817" y="195" width="46" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_App1_di" bpmnElement="Flow_App1" bioc:stroke="#0284c7" color:border-color="#0284c7">
        <di:waypoint x="268" y="170" />
        <di:waypoint x="320" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_App2_di" bpmnElement="Flow_App2" bioc:stroke="#475569" color:border-color="#475569">
        <di:waypoint x="385" y="210" />
        <di:waypoint x="385" y="320" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_App3_di" bpmnElement="Flow_App3" bioc:stroke="#7c3aed" color:border-color="#7c3aed">
        <di:waypoint x="450" y="360" />
        <di:waypoint x="505" y="360" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_AppYes_di" bpmnElement="Flow_AppYes" bioc:stroke="#16a34a" color:border-color="#16a34a">
        <di:waypoint x="555" y="360" />
        <di:waypoint x="610" y="360" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="573" y="342" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_AppNo_di" bpmnElement="Flow_AppNo" bioc:stroke="#dc2626" color:border-color="#dc2626">
        <di:waypoint x="530" y="385" />
        <di:waypoint x="530" y="412" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="536" y="392" width="41" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_AppFinish_di" bpmnElement="Flow_AppFinish" bioc:stroke="#16a34a" color:border-color="#16a34a">
        <di:waypoint x="740" y="360" />
        <di:waypoint x="780" y="360" />
        <di:waypoint x="780" y="170" />
        <di:waypoint x="822" y="170" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

/**
 * Generates a simple linear sequence: Start -> Task (${processName}) -> End
 */
export function generateSimpleBpmnXml(processName: string): string {
  const pName = escapeXml(processName || 'اقدام فرآیندی');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="شروع">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="${pName}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="پایان">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1" bioc:stroke="#16a34a" bioc:fill="#dcfce7" color:border-color="#16a34a" color:background-color="#dcfce7">
        <dc:Bounds x="182" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="188" y="205" width="25" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1" bioc:stroke="#0284c7" bioc:fill="#e0f2fe" color:border-color="#0284c7" color:background-color="#e0f2fe">
        <dc:Bounds x="280" y="140" width="140" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1" bioc:stroke="#dc2626" bioc:fill="#fee2e2" color:border-color="#dc2626" color:background-color="#fee2e2">
        <dc:Bounds x="482" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="489" y="205" width="22" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1" bioc:stroke="#0284c7" color:border-color="#0284c7">
        <di:waypoint x="218" y="180" />
        <di:waypoint x="280" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2" bioc:stroke="#16a34a" color:border-color="#16a34a">
        <di:waypoint x="420" y="180" />
        <di:waypoint x="482" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

/**
 * Generates a clean empty canvas with just a start event for freehand modeling.
 */
export function generateBlankBpmnXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="شروع">
    </bpmn:startEvent>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1" bioc:stroke="#16a34a" bioc:fill="#dcfce7" color:border-color="#16a34a" color:background-color="#dcfce7">
        <dc:Bounds x="182" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="188" y="205" width="25" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

