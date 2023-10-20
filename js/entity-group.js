class EntityGroup{
    constructor(entity,entity_start_x,entity_start_y,entity_stop_x,entity_stop_y){
        this.start_x=entity_start_x;
        this.start_y=entity_start_y;
        this.stop_x=entity_stop_x;
        this.stop_y=entity_stop_y;
        this.entities=[entity];
    }
    push_entity(entity,entity_stop_x,entity_stop_y){
        this.stop_x=entity_stop_x;
        this.stop_y=entity_stop_y;
        
        this.entities.push(entity);
    }
    unshift_entity(entity,entity_start_x,entity_start_y){
        this.start_x=entity_start_x;
        this.start_y=entity_start_y;
        this.entities.unshift(entity);
    }

    // 合并两个 entity_group
    push_group(another_group){
        this.entities=this.entities.concat(another_group.entities)
        this.stop_x=another_group.stop_x;
        this.stop_y=another_group.stop_y;
    }

    unshift_group(another_group){
        this.entities=[].concat(another_group.entities,this.entities);
        this.start_x=another_group.start_x;
        this.start_y=another_group.start_y;
    }

    push_reversed_group(another_group){
        let that_entities=[];
        for (let entity of another_group.entities){
            that_entities.unshift(reverseEntity(entity));
        }
        this.entities=this.entities.concat(that_entities)
        this.stop_x=another_group.start_x;
        this.stop_y=another_group.start_y;
    }

    unshift_reversed_group(another_group){
        let that_entities=[];
        for (let entity of another_group.entities){
            that_entities.unshift(reverseEntity(entity));
        }
        this.entities=[].concat(that_entities,this.entities);
        this.start_x=another_group.stop_x;
        this.start_y=another_group.stop_y;
    }
}

function valueEqual(a,b){
    return Math.abs(a-b)< 10e-5;
}


function reverseEntity(entity){
    // 实际需要，目前仅仅支持 ARC和 LINE
    let temp;
    if (entity.type=="ARC"){
        temp=entity.startAngle;
        entity.startAngle=entity.endAngle;
        entity.endAngle=temp;
        entity.rotateDir=!entity.rotateDir;

    }else if (entity.type=="LINE"){
        temp=entity.vertices[0]["x"];
        entity.vertices[0]["x"]=entity.vertices[1]["x"];
        entity.vertices[1]["x"]=temp;
        temp=entity.vertices[0]["y"];
        entity.vertices[0]["y"]=entity.vertices[1]["y"];
        entity.vertices[1]["y"]=temp;
    }else{
        throw("Unsupport Entity Type: ",entity.type);
    }
    return entity;
}

export function getEntityGroups(dxf){
    let temp_entity_groups=[];
    dxf.entities.forEach(entity => {
        let entity_start_x,entity_start_y,entity_stop_x,entity_stop_y;
        

        // 鱼咬尾
        if (entity.type=="ARC"){
            let center_x,center_y,radius,start_angle,stop_angle;
            center_x=entity.center["x"];
            center_y=entity.center["y"];
            radius=entity.radius;
            start_angle=entity.startAngle;
            stop_angle=entity.endAngle;
            // 计算 entity_start_x,entity_start_y,entity_stop_x,entity_stop_y
            entity_start_x=center_x+radius*Math.cos(start_angle);
            entity_start_y=center_y+radius*Math.sin(start_angle);
            entity_stop_x=center_x+radius*Math.cos(stop_angle);
            entity_stop_y=center_y+radius*Math.sin(stop_angle);
            entity.rotateDir=false;

        }else if (entity.type=="LINE"){
            entity_start_x=entity.vertices[0]["x"];
            entity_start_y=entity.vertices[0]["y"];
            entity_stop_x=entity.vertices[1]["x"];
            entity_stop_y=entity.vertices[1]["y"];
        }else{
            throw("Unsupport Entity Type: ",entity.type);
        }

        // 默认 entity 无家可归
        let homeless = true;
        // 进入 丑小鸭找妈妈 环节
        for (let i=0;i <temp_entity_groups.length;i++){
            let group=temp_entity_groups[i]
            if (valueEqual(group.start_x,entity_stop_x) &&valueEqual(group.start_y,entity_stop_y)){
                // group 头碰 entity 尾
                // start -> stop
                // [<-<-<-][<-]
                group.unshift_entity(entity,entity_start_x,entity_start_y);
                homeless = false;
                break;
            }else if (valueEqual(group.stop_x,entity_start_x) && valueEqual(group.stop_y,entity_start_y)){
                // 尾碰头
                //[<-][<-<-<-]
                group.push_entity(entity,entity_stop_x,entity_stop_y);
                homeless = false;
                break;
            }else if (valueEqual(group.start_x,entity_start_x) &&valueEqual(group.start_y,entity_start_y)){
                // group 头碰头
                //[<-<-<-][->]
                group.unshift_entity(reverseEntity(entity),entity_stop_x,entity_stop_y);
                homeless = false;
                break;
            }else if (valueEqual(group.stop_x,entity_stop_x) && valueEqual(group.stop_y,entity_stop_y)){
                // 尾碰尾
                //[->][<-<-<-]
                group.push_entity(reverseEntity(entity),entity_start_x,entity_start_y);
                homeless = false;
                break;
            }
        }

        // 自立门户
        if (homeless){
            temp_entity_groups.push(new EntityGroup(entity,entity_start_x,entity_start_y,entity_stop_x,entity_stop_y));
            return;
        }

    });

    let merged_entity_groups=[];
    temp_entity_groups.forEach(group => {
        // 默认 group 无家可归
        let homeless = true;
        merged_entity_groups.forEach(merged_group =>{
            if (valueEqual(merged_group.stop_x,group.start_x) && valueEqual(merged_group.stop_y,group.start_y)){
                // 头碰尾
                // start -> stop
                // m: merged_group g: group
                // [<-<-g<-<-][<-<-m<-<-]
                merged_group.push_group(group);
                homeless = false;
            }else if (valueEqual(merged_group.start_x,group.stop_x) && valueEqual(merged_group.start_y,group.stop_y)){
                // 尾碰头
                // m: merged_group g: group
                // [<-<-m<-<-][<-<-g<-<-]
                merged_group.unshift_group(group);
                homeless = false;
            }else if (valueEqual(merged_group.stop_x,group.stop_x) && valueEqual(merged_group.stop_y,group.stop_y)){
                // 尾碰尾
                // m: merged_group g: group
                // [->->m->->][<-<-g<-<-]
                merged_group.push_reversed_group(group);
                homeless = false;
            }else if (valueEqual(merged_group.start_x,group.start_x) && valueEqual(merged_group.start_y,group.start_y)){
                
                // 头碰头
                // m: merged_group g: group
                // [<-<-g<-<-][->->m->->]
                merged_group.unshift_reversed_group(group);
                homeless = false;
            }
        })
        // 开宗立派
        if (homeless){
            merged_entity_groups.push(group);
        }
        
    })
    return merged_entity_groups;
}